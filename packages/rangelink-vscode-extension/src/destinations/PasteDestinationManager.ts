import type { Logger, LoggingContext } from '@couimet/logger-contract';
import type { FormattedLink } from 'rangelink-core-ts';

import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { BindingFeedback } from '../feedback';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  BindFailureReason,
  type BindOptions,
  type ConfirmationQuickPickItem,
  type DestinationKind,
  ExtensionResult,
  isCustomAiAssistantKind,
  MessageCode,
  type StatusBarOptions,
  type TextEditorBindOptions,
} from '../types';
import { formatMessage, isBinaryFile, isWritableScheme } from '../utils';

import { BoundSession } from './BoundSession';
import type { DestinationBinder } from './DestinationBinder';
import type { DestinationFocuser } from './DestinationFocuser';
import type { DestinationRegistry } from './DestinationRegistry';
import type { PasteDestination } from './PasteDestination';

/**
 * Success information returned when binding to a destination.
 */
export interface BindSuccessInfo {
  readonly destinationName: string;
  readonly destinationKind: DestinationKind;
  /** Set when a background tab was brought to foreground — cursor position is unknown, auto-paste should be suppressed. */
  readonly suppressAutoPaste?: true;
}

/**
 * Success information returned when focusing a bound destination.
 *
 * Extends BindSuccessInfo since focus operations require a bound destination.
 * Aliased separately to allow future extension without breaking changes.
 */
export type FocusSuccessInfo = BindSuccessInfo;

export class PasteDestinationManager implements DestinationBinder, DestinationFocuser {
  constructor(
    private readonly registry: DestinationRegistry,
    private readonly vscodeAdapter: VscodeAdapter,
    private readonly session: BoundSession,
    private readonly feedback: BindingFeedback,
    private readonly logger: Logger,
  ) {}

  async bind(
    options: BindOptions,
    statusBarOptions?: StatusBarOptions,
  ): Promise<ExtensionResult<BindSuccessInfo>> {
    switch (options.kind) {
      case 'terminal': {
        const newDestination = this.registry.create({
          kind: 'terminal',
          terminal: options.terminal,
        });
        return this.commitBind(newDestination, statusBarOptions ? { statusBarOptions } : undefined);
      }
      case 'text-editor':
        return this.bindTextEditor(options, statusBarOptions);
      case 'cursor-ai':
      case 'gemini-code-assist':
      case 'github-copilot-chat':
      case 'claude-code':
        return this.bindGenericDestination(options.kind, statusBarOptions);
      default:
        if (isCustomAiAssistantKind(options.kind)) {
          return this.bindGenericDestination(options.kind, statusBarOptions);
        }
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
          message: `Unhandled bind options kind: ${(options as BindOptions).kind}`,
          functionName: 'PasteDestinationManager.bind',
          details: { options },
        });
    }
  }

  /**
   * Bind to a destination and immediately focus it.
   *
   * Convenience method that combines bind() and focusBoundDestination().
   *
   * @param options - The destination bind options
   * @returns ExtensionResult with focus success info or error from either bind or focus
   */
  async bindAndFocus(options: BindOptions): Promise<ExtensionResult<FocusSuccessInfo>> {
    const bindResult = await this.bind(options);
    if (!bindResult.success) {
      return ExtensionResult.err(bindResult.error);
    }
    return this.focusBoundDestination({ skipMessage: true });
  }

  /**
   * Unbind current destination
   */
  unbind(): void {
    const bound = this.session.get();
    if (!bound) {
      this.logger.info({ fn: 'PasteDestinationManager.unbind' }, 'No destination bound');
      this.feedback.notifyNothingToUnbind();
      return;
    }

    const displayName = bound.displayName;

    this.session.clear();

    this.logger.info(
      { fn: 'PasteDestinationManager.unbind', displayName },
      `Successfully unbound from ${displayName}`,
    );

    this.feedback.notifyUnbound(displayName);
  }

  /**
   * Focus the currently bound destination.
   *
   * Brings the bound destination into focus/view for quick navigation.
   *
   * @param options.skipMessage - If true, suppresses the status bar success message.
   *   Used by bindAndFocus() where the binding toast is already shown.
   * @returns ExtensionResult with FocusSuccessInfo on success, error on failure
   */
  async focusBoundDestination(
    options?: StatusBarOptions,
  ): Promise<ExtensionResult<FocusSuccessInfo>> {
    const bound = this.session.get();
    if (!bound) {
      return ExtensionResult.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_BOUND,
          message: 'No destination is currently bound',
          functionName: 'PasteDestinationManager.focusBoundDestination',
        }),
      );
    }
    const destinationKind = bound.id;
    const displayName = bound.displayName;
    const logCtx = {
      fn: 'PasteDestinationManager.focusBoundDestination',
      destinationKind,
      displayName,
      ...bound.getLoggingDetails(),
    };
    this.logger.debug(logCtx, `Attempting to focus ${displayName}`);
    const focused = await bound.focus();
    if (!focused) {
      this.logger.warn(logCtx, `Failed to focus ${displayName}`);
      this.feedback.notifyJumpFailed(displayName);
      return ExtensionResult.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_FOCUS_FAILED,
          message: `Failed to focus destination: ${displayName}`,
          functionName: 'PasteDestinationManager.focusBoundDestination',
          details: { destinationKind, displayName },
        }),
      );
    }
    if (!options?.skipMessage) this.feedback.notifyJumpFocused(bound.getJumpSuccessMessage());
    this.logger.info(logCtx, `Successfully focused ${displayName}`);
    return ExtensionResult.ok({ destinationName: displayName, destinationKind });
  }

  async sendLinkToDestination(formattedLink: FormattedLink): Promise<boolean> {
    return this.executeSend({
      logContext: {
        fn: 'PasteDestinationManager.sendLinkToDestination',
        formattedLink,
      },
      debugMessage: (displayName) => `Sending link to ${displayName}`,
      errorMessage: (displayName) => `Paste link failed to ${displayName}`,
      execute: (destination) => destination.pasteLink(formattedLink),
    });
  }

  /**
   * Send text content to bound destination.
   *
   * @param content - The text content to send
   * @returns true if sent successfully, false otherwise
   */
  async sendTextToDestination(content: string): Promise<boolean> {
    return this.executeSend({
      logContext: {
        fn: 'PasteDestinationManager.sendTextToDestination',
        contentLength: content.length,
      },
      debugMessage: (displayName) => `Sending content to ${displayName} (${content.length} chars)`,
      errorMessage: (displayName) => `Paste content failed to ${displayName}`,
      execute: (destination) => destination.pasteContent(content),
    });
  }

  /**
   * Bind to text editor (special case requiring active text editor)
   *
   * **Requirements:**
   * - Active editor must be text-like file (not binary, not terminal)
   * - Active editor must have focus
   *
   * Self-paste (source === destination) is checked at paste time, not binding time.
   *
   * @returns ExtensionResult with bind success info or error
   */
  private async bindTextEditor(
    options: TextEditorBindOptions,
    statusBarOptions?: StatusBarOptions,
  ): Promise<ExtensionResult<BindSuccessInfo>> {
    const fnName = 'bindTextEditor';

    const fileName = this.vscodeAdapter.getFilenameFromUri(options.uri);
    let wasBackgroundTab = false;

    if (!this.vscodeAdapter.hasVisibleEditorAt(options.uri, options.viewColumn)) {
      const logCtx = {
        fn: 'PasteDestinationManager.bindTextEditor',
        uri: options.uri.toString(),
        viewColumn: options.viewColumn,
        fileName,
      };
      this.logger.debug(logCtx, 'Editor not visible, bringing background tab to foreground');
      try {
        await this.vscodeAdapter.showTextDocument(options.uri, { viewColumn: options.viewColumn });
      } catch (error) {
        this.logger.warn({ ...logCtx, error }, 'showTextDocument threw for background tab');
        this.feedback.notifyBindFailedEditor(MessageCode.ERROR_BACKGROUND_TAB_OPEN_FAILED, {
          fileName,
        });
        return this.bindFailedResult(
          fnName,
          `No visible editor for ${options.uri.toString()} at viewColumn ${options.viewColumn}`,
          BindFailureReason.NO_ACTIVE_EDITOR,
        );
      }
      if (!this.vscodeAdapter.hasVisibleEditorAt(options.uri, options.viewColumn)) {
        this.logger.warn(logCtx, 'showTextDocument resolved but editor not at expected viewColumn');
        this.feedback.notifyBindFailedEditor(MessageCode.ERROR_BACKGROUND_TAB_WRONG_VIEW_COLUMN, {
          fileName,
        });
        return this.bindFailedResult(
          fnName,
          `Editor opened but not visible at expected viewColumn ${options.viewColumn}`,
          BindFailureReason.NO_ACTIVE_EDITOR,
        );
      }
      this.feedback.notifyBackgroundTabOpened(fileName);
      wasBackgroundTab = true;
    }

    const scheme = options.uri.scheme;
    const fsPath = options.uri.fsPath;
    const logCtx = { fn: 'PasteDestinationManager.bindTextEditor', scheme, fileName };

    if (!isWritableScheme(scheme)) {
      this.logger.warn(logCtx, `Cannot bind: Editor is read-only (scheme: ${scheme})`);
      this.feedback.notifyBindFailedEditor(MessageCode.ERROR_TEXT_EDITOR_READ_ONLY, { scheme });
      return this.bindFailedResult(
        fnName,
        `Editor is read-only (scheme: ${scheme})`,
        BindFailureReason.EDITOR_READ_ONLY,
      );
    }

    if (isBinaryFile(scheme, fsPath)) {
      this.logger.warn(logCtx, 'Cannot bind: Editor is a binary file');
      this.feedback.notifyBindFailedEditor(MessageCode.ERROR_TEXT_EDITOR_BINARY_FILE, { fileName });
      return this.bindFailedResult(
        fnName,
        'Editor is a binary file',
        BindFailureReason.EDITOR_BINARY_FILE,
      );
    }

    const newDestination = this.registry.create(options);

    const bindOptions = this.buildCommitBindOptions(wasBackgroundTab, statusBarOptions);
    return this.commitBind(newDestination, bindOptions);
  }

  /**
   * Bind to generic destination (AI assistant destinations, etc.)
   *
   * @param kind - The destination kind (AI assistants only)
   * @returns ExtensionResult with bind success info or error
   */
  private async bindGenericDestination(
    kind: DestinationKind,
    statusBarOptions?: StatusBarOptions,
  ): Promise<ExtensionResult<BindSuccessInfo>> {
    const fnName = 'bindGenericDestination';

    const newDestination = this.registry.create({ kind } as BindOptions);

    if (!(await newDestination.isAvailable())) {
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindGenericDestination', kind },
        `Cannot bind: ${newDestination.displayName} not available`,
      );

      this.feedback.notifyBindFailedNotAvailable(newDestination.displayName, kind);

      return this.bindFailedResult(
        fnName,
        `${newDestination.displayName} not available`,
        BindFailureReason.DESTINATION_NOT_AVAILABLE,
      );
    }

    return this.commitBind(newDestination, statusBarOptions ? { statusBarOptions } : undefined);
  }

  /**
   * Shared bind lifecycle: equals check, confirm replace, unbind old, set new, log, toast, return ok.
   *
   * Callers handle pre-validation (resource availability, editor checks) and destination creation,
   * then delegate the common bind flow here.
   *
   * @param newDestination - The destination to bind
   * @param bindOptions - Optional bind metadata (suppressAutoPaste for background-tab binds, statusBarOptions to suppress toast)
   */
  private async commitBind(
    newDestination: PasteDestination,
    bindOptions?: { suppressAutoPaste?: true; statusBarOptions?: StatusBarOptions },
  ): Promise<ExtensionResult<BindSuccessInfo>> {
    const kind = newDestination.id;
    const logCtx = { fn: 'PasteDestinationManager.commitBind', kind };

    const currentBound = this.session.get();
    if (currentBound && (await currentBound.equals(newDestination))) {
      this.logger.debug(
        { ...logCtx, displayName: newDestination.displayName },
        `Already bound to ${newDestination.displayName}, no action taken`,
      );
      this.feedback.notifyAlreadyBound(newDestination.displayName);

      return this.bindFailedResult(
        'commitBind',
        'Already bound to same destination',
        BindFailureReason.ALREADY_BOUND_TO_SAME,
      );
    }

    let replacedName: string | undefined;

    if (currentBound) {
      const confirmed = await this.confirmReplaceBinding(
        currentBound,
        kind,
        newDestination.displayName,
      );

      if (!confirmed) {
        this.logger.debug(logCtx, 'User cancelled binding replacement');
        return this.bindFailedResult(
          'commitBind',
          'User cancelled binding replacement',
          BindFailureReason.USER_CANCELLED_REPLACEMENT,
        );
      }

      replacedName = currentBound.displayName;
      this.logger.info(
        { ...logCtx, displayName: replacedName },
        `Unbinding "${replacedName}" for replacement`,
      );
      this.session.clear();
    }

    this.session.set(newDestination);
    this.logger.info(
      { ...logCtx, displayName: newDestination.displayName, ...newDestination.getLoggingDetails() },
      `Successfully bound to "${newDestination.displayName}"`,
    );

    if (!bindOptions?.statusBarOptions?.skipMessage) {
      if (replacedName) {
        this.feedback.notifyRebound(newDestination.displayName, replacedName);
      } else {
        this.feedback.notifyBound(newDestination.displayName);
      }
    }

    return ExtensionResult.ok({
      destinationName: newDestination.displayName,
      destinationKind: kind,
      ...(bindOptions?.suppressAutoPaste && { suppressAutoPaste: true as const }),
    });
  }

  private buildCommitBindOptions(
    wasBackgroundTab: boolean,
    statusBarOptions?: StatusBarOptions,
  ): { suppressAutoPaste?: true; statusBarOptions?: StatusBarOptions } | undefined {
    return wasBackgroundTab || statusBarOptions
      ? {
          ...(wasBackgroundTab && { suppressAutoPaste: true as const }),
          ...(statusBarOptions && { statusBarOptions }),
        }
      : undefined;
  }

  private async executeSend(options: {
    logContext: LoggingContext;
    debugMessage: (displayName: string) => string;
    errorMessage: (displayName: string) => string;
    execute: (destination: PasteDestination) => Promise<boolean>;
  }): Promise<boolean> {
    const destination = this.session.get();
    if (!destination) {
      this.logger.debug(options.logContext, 'No destination bound');
      return false;
    }

    const displayName = destination.displayName || 'destination';

    const enhancedLogContext: LoggingContext = {
      ...options.logContext,
      destinationKind: destination.id,
      displayName,
      ...destination.getLoggingDetails(),
    };

    this.logger.debug(enhancedLogContext, options.debugMessage(displayName));

    const pasteSucceeded = await options.execute(destination);

    if (pasteSucceeded) {
      this.logger.info(enhancedLogContext, `Pasted to ${displayName}`);
    } else {
      this.logger.error(enhancedLogContext, options.errorMessage(displayName));
    }

    return pasteSucceeded;
  }

  private bindFailedResult(
    functionName: string,
    message: string,
    failedBindDetails: BindFailureReason,
  ): ExtensionResult<BindSuccessInfo> {
    return ExtensionResult.err(
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
        message,
        functionName: `PasteDestinationManager.${functionName}`,
        details: { failedBindDetails },
      }),
    );
  }

  /**
   * Show confirmation dialog for replacing existing binding
   *
   * Uses QuickPick with descriptive labels to confirm user intent.
   * User can confirm replacement or cancel to keep current binding.
   *
   * @param currentDestination - Currently bound destination
   * @param newKind - Destination kind user wants to bind
   * @param newDisplayName - Display name of new destination
   * @returns true if user confirms replacement, false if cancelled
   */
  private async confirmReplaceBinding(
    currentDestination: PasteDestination,
    newKind: DestinationKind,
    newDisplayName: string,
  ): Promise<boolean> {
    const params = {
      currentDestination: currentDestination.displayName,
      newDestination: newDisplayName,
    };

    const items: ConfirmationQuickPickItem[] = [
      {
        label: formatMessage(MessageCode.SMART_BIND_CONFIRM_YES_REPLACE),
        description: formatMessage(MessageCode.SMART_BIND_CONFIRM_YES_DESCRIPTION, params),
        confirmed: true,
      },
      {
        label: formatMessage(MessageCode.SMART_BIND_CONFIRM_NO_KEEP),
        description: formatMessage(MessageCode.SMART_BIND_CONFIRM_NO_DESCRIPTION, params),
        confirmed: false,
      },
    ];

    const choice = await this.vscodeAdapter.showQuickPick(items, {
      placeHolder: formatMessage(MessageCode.SMART_BIND_CONFIRM_PLACEHOLDER, params),
    });

    const confirmed = choice?.confirmed ?? false;

    this.logger.debug(
      {
        fn: 'PasteDestinationManager.confirmReplaceBinding',
        currentKind: currentDestination.id,
        newKind,
        confirmed,
      },
      confirmed ? 'User confirmed replacement' : 'User cancelled replacement',
    );

    return confirmed;
  }
}
