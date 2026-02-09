import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { CONTEXT_IS_BOUND } from '../constants';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  type AIAssistantDestinationKind,
  AutoPasteResult,
  BindFailureReason,
  type BindOptions,
  type DestinationKind,
  ExtensionResult,
  MessageCode,
} from '../types';
import {
  formatMessage,
  isBinaryFile,
  isEditorDestination,
  isTerminalDestination,
  isWritableScheme,
  type PaddingMode,
} from '../utils';

import type { DestinationRegistry } from './DestinationRegistry';
import type { PasteDestination } from './PasteDestination';

/**
 * Success information returned when binding to a destination.
 */
export interface BindSuccessInfo {
  readonly destinationName: string;
  readonly destinationKind: DestinationKind;
}

/**
 * Success information returned when focusing a bound destination.
 *
 * Extends BindSuccessInfo since focus operations require a bound destination.
 * Aliased separately to allow future extension without breaking changes.
 */
export type FocusSuccessInfo = BindSuccessInfo;

/**
 * Unified destination manager for RangeLink (Phase 3)
 *
 * Manages binding to any paste destination (terminals, text editors, AI assistants, etc.)
 * Replaces TerminalBindingManager and ChatDestinationManager with single unified system.
 *
 * **Design:**
 * - Only one destination bound at a time (terminal OR text-editor OR AI assistant)
 * - Terminal binding requires active terminal reference
 * - AI assistant destinations use availability check (e.g., Cursor IDE detection, Claude Code extension)
 * - Terminal-only auto-unbind on terminal close (different semantics)
 * - No state persistence across reloads (same as legacy behavior)
 */
export class PasteDestinationManager implements vscode.Disposable {
  /**
   * Static lookup table mapping AI assistant destination kinds to unavailable error message codes
   */
  private static readonly AI_ASSISTANT_ERROR_CODES: Record<
    AIAssistantDestinationKind,
    MessageCode
  > = {
    'claude-code': MessageCode.ERROR_CLAUDE_CODE_NOT_AVAILABLE,
    'cursor-ai': MessageCode.ERROR_CURSOR_AI_NOT_AVAILABLE,
    'github-copilot-chat': MessageCode.ERROR_GITHUB_COPILOT_CHAT_NOT_AVAILABLE,
  };

  private boundDestination: PasteDestination | undefined;
  private disposables: vscode.Disposable[] = [];
  private replacedDestinationName: string | undefined; // Track for toast notifications

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly registry: DestinationRegistry,
    private readonly vscodeAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {
    // Listen for terminal closure (terminal-only auto-unbind)
    this.setupTerminalCloseListener();
    // Listen for text document closure (text-editor-only auto-unbind)
    this.setupTextDocumentCloseListener();
  }

  /**
   * Bind to a destination using typed options.
   *
   * @param options - Discriminated union specifying destination kind and kind-specific options
   * @returns ExtensionResult with bind success info or error
   */
  async bind(options: BindOptions): Promise<ExtensionResult<BindSuccessInfo>> {
    switch (options.kind) {
      case 'terminal': {
        const newDestination = this.registry.create({
          kind: 'terminal',
          terminal: options.terminal,
        });
        return this.commitBind(newDestination, 'terminal');
      }
      case 'text-editor':
        return this.bindTextEditor();
      case 'cursor-ai':
      case 'github-copilot-chat':
      case 'claude-code':
        return this.bindGenericDestination(options.kind);
      default:
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
    return this.focusBoundDestination({ silent: true });
  }

  /**
   * Bind to a destination kind and immediately focus it.
   *
   * Convenience wrapper for status bar callers that pass DestinationKind.
   * Terminal case resolves activeTerminal from the IDE adapter.
   *
   * @param kind - The destination kind to bind and focus
   * @returns true if bind and focus both succeeded, false otherwise
   */
  async bindAndJump(kind: DestinationKind): Promise<boolean> {
    let options: BindOptions;

    if (kind === 'terminal') {
      const activeTerminal = this.vscodeAdapter.activeTerminal;
      if (!activeTerminal) {
        this.logger.warn({ fn: 'PasteDestinationManager.bindAndJump' }, 'No active terminal');
        this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
        return false;
      }
      options = { kind: 'terminal', terminal: activeTerminal };
    } else {
      options = { kind } as BindOptions;
    }

    const result = await this.bindAndFocus(options);
    return result.success;
  }

  /**
   * Unbind current destination
   */
  unbind(): void {
    if (!this.boundDestination) {
      this.logger.info({ fn: 'PasteDestinationManager.unbind' }, 'No destination bound');
      this.vscodeAdapter.setStatusBarMessage(
        formatMessage(MessageCode.STATUS_BAR_DESTINATION_NOT_BOUND),
      );
      return;
    }

    const displayName = this.boundDestination.displayName;

    this.clearBoundDestination();

    this.logger.info(
      { fn: 'PasteDestinationManager.unbind', displayName },
      `Successfully unbound from ${displayName}`,
    );

    this.vscodeAdapter.setStatusBarMessage(
      formatMessage(MessageCode.STATUS_BAR_DESTINATION_UNBOUND, { destinationName: displayName }),
    );
  }

  /**
   * Check if any destination is bound
   */
  isBound(): boolean {
    return this.boundDestination !== undefined;
  }

  /**
   * Get current bound destination (for status display)
   */
  getBoundDestination(): PasteDestination | undefined {
    return this.boundDestination;
  }

  /**
   * Focus the currently bound destination.
   *
   * Brings the bound destination into focus/view for quick navigation.
   *
   * @param options.silent - If true, suppresses the status bar success message.
   *   Used by bindAndFocus() where the binding toast is already shown.
   * @returns ExtensionResult with FocusSuccessInfo on success, error on failure
   */
  async focusBoundDestination(options?: {
    silent?: boolean;
  }): Promise<ExtensionResult<FocusSuccessInfo>> {
    if (!this.boundDestination) {
      return ExtensionResult.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_BOUND,
          message: 'No destination is currently bound',
          functionName: 'PasteDestinationManager.focusBoundDestination',
        }),
      );
    }

    const destinationKind = this.boundDestination.id;
    const displayName = this.boundDestination.displayName;

    const logCtx = {
      fn: 'PasteDestinationManager.focusBoundDestination',
      destinationKind,
      displayName,
      ...this.boundDestination.getLoggingDetails(),
    };

    this.logger.debug(logCtx, `Attempting to focus ${displayName}`);

    const focused = await this.boundDestination.focus();

    if (!focused) {
      this.logger.warn(logCtx, `Failed to focus ${displayName}`);
      this.vscodeAdapter.showInformationMessage(
        formatMessage(MessageCode.INFO_JUMP_FOCUS_FAILED, { destinationName: displayName }),
      );
      return ExtensionResult.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_FOCUS_FAILED,
          message: `Failed to focus destination: ${displayName}`,
          functionName: 'PasteDestinationManager.focusBoundDestination',
          details: { destinationKind, displayName },
        }),
      );
    }

    if (!options?.silent) {
      const successMessage = this.boundDestination.getJumpSuccessMessage();
      this.vscodeAdapter.setStatusBarMessage(successMessage);
    }

    this.logger.info(logCtx, `Successfully focused ${displayName}`);

    return ExtensionResult.ok({ destinationName: displayName, destinationKind });
  }

  /**
   * Send a formatted RangeLink to bound destination with user feedback
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @param basicStatusMessage - Base message for status bar (e.g., "RangeLink copied to clipboard")
   * @param paddingMode - How to apply smart padding (both, before, after, none)
   * @returns true if sent successfully, false otherwise
   */
  async sendLinkToDestination(
    formattedLink: FormattedLink,
    basicStatusMessage: string,
    paddingMode: PaddingMode,
  ): Promise<boolean> {
    return this.sendWithFeedback({
      basicStatusMessage,
      logContext: {
        fn: 'PasteDestinationManager.sendLinkToDestination',
        formattedLink,
        paddingMode,
      },
      debugMessage: (displayName) => `Sending link to ${displayName}`,
      errorMessage: (displayName) => `Paste link failed to ${displayName}`,
      execute: (destination) => destination.pasteLink(formattedLink, paddingMode),
    });
  }

  /**
   * Send text content to bound destination with user feedback
   *
   * Similar to sendToDestination() but for raw text content instead of FormattedLink.
   * Used for pasting selected text directly to bound destinations (issue #89).
   *
   * @param content - The text content to send
   * @param basicStatusMessage - Base message for status bar (e.g., "Text copied to clipboard")
   * @param paddingMode - How to apply smart padding (both, before, after, none)
   * @returns true if sent successfully, false otherwise
   */
  async sendTextToDestination(
    content: string,
    basicStatusMessage: string,
    paddingMode: PaddingMode,
  ): Promise<boolean> {
    return this.sendWithFeedback({
      basicStatusMessage,
      logContext: {
        fn: 'PasteDestinationManager.sendTextToDestination',
        contentLength: content.length,
        paddingMode,
      },
      debugMessage: (displayName) => `Sending content to ${displayName} (${content.length} chars)`,
      errorMessage: (displayName) => `Paste content failed to ${displayName}`,
      execute: (destination) => destination.pasteContent(content, paddingMode),
    });
  }

  /**
   * Dispose of resources (cleanup event listeners)
   */
  dispose(): void {
    this.disposables.forEach((d) => d?.dispose());
    this.disposables = [];
  }

  /**
   * Setup terminal closure listener for auto-unbind
   *
   * Terminal-only behavior: auto-unbind when terminal closes.
   * AI assistant destinations don't need this (persistent across extension lifecycle).
   */
  private setupTerminalCloseListener(): void {
    const terminalCloseDisposable = this.vscodeAdapter.onDidCloseTerminal((closedTerminal) => {
      if (!isTerminalDestination(this.boundDestination)) {
        return;
      }

      if (this.boundDestination.resource.terminal === closedTerminal) {
        const terminalName = closedTerminal.name || 'Unnamed Terminal';
        this.logger.info(
          { fn: 'PasteDestinationManager.onDidCloseTerminal', terminalName },
          `Bound terminal closed: ${terminalName} - auto-unbinding`,
        );
        this.unbind();
        this.vscodeAdapter.setStatusBarMessage(
          formatMessage(MessageCode.STATUS_BAR_DESTINATION_BINDING_REMOVED_TERMINAL_CLOSED),
        );
      }
    });

    this.context.subscriptions.push(terminalCloseDisposable);
    this.disposables.push(terminalCloseDisposable);
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
  private async bindTextEditor(): Promise<ExtensionResult<BindSuccessInfo>> {
    const fnName = 'bindTextEditor';

    const activeEditor = this.vscodeAdapter.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn({ fn: 'PasteDestinationManager.bindTextEditor' }, 'No active text editor');
      this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TEXT_EDITOR));
      return this.bindFailedResult(
        fnName,
        'No active text editor',
        BindFailureReason.NO_ACTIVE_EDITOR,
      );
    }

    const editorUri = this.vscodeAdapter.getDocumentUri(activeEditor);
    const scheme = editorUri.scheme;
    const fsPath = editorUri.fsPath;
    const fileName = this.vscodeAdapter.getFilenameFromUri(editorUri);
    const logCtx = { fn: 'PasteDestinationManager.bindTextEditor', scheme, fileName };

    if (!isWritableScheme(scheme)) {
      this.logger.warn(logCtx, `Cannot bind: Editor is read-only (scheme: ${scheme})`);
      this.vscodeAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TEXT_EDITOR_READ_ONLY, { scheme }),
      );
      return this.bindFailedResult(
        fnName,
        `Editor is read-only (scheme: ${scheme})`,
        BindFailureReason.EDITOR_READ_ONLY,
      );
    }

    if (isBinaryFile(scheme, fsPath)) {
      this.logger.warn(logCtx, 'Cannot bind: Editor is a binary file');
      this.vscodeAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TEXT_EDITOR_BINARY_FILE, { fileName }),
      );
      return this.bindFailedResult(
        fnName,
        'Editor is a binary file',
        BindFailureReason.EDITOR_BINARY_FILE,
      );
    }

    const newDestination = this.registry.create({
      kind: 'text-editor',
      editor: activeEditor,
    });

    return this.commitBind(newDestination, 'text-editor');
  }

  /**
   * Bind to generic destination (AI assistant destinations, etc.)
   *
   * @param kind - The destination kind (AI assistants only)
   * @returns ExtensionResult with bind success info or error
   */
  private async bindGenericDestination(
    kind: AIAssistantDestinationKind,
  ): Promise<ExtensionResult<BindSuccessInfo>> {
    const fnName = 'bindGenericDestination';

    const newDestination = this.registry.create({ kind });

    if (!(await newDestination.isAvailable())) {
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindGenericDestination', kind },
        `Cannot bind: ${newDestination.displayName} not available`,
      );

      const messageCode =
        PasteDestinationManager.AI_ASSISTANT_ERROR_CODES[kind] ??
        (() => {
          throw new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
            message: `Unhandled AI assistant destination kind: ${kind}`,
            functionName: 'PasteDestinationManager.bindGenericDestination',
            details: { kind },
          });
        })();

      this.vscodeAdapter.showErrorMessage(formatMessage(messageCode));

      return this.bindFailedResult(
        fnName,
        `${newDestination.displayName} not available`,
        BindFailureReason.DESTINATION_NOT_AVAILABLE,
      );
    }

    return this.commitBind(newDestination, kind);
  }

  /**
   * Shared bind lifecycle: equals check, confirm replace, unbind old, set new, log, toast, return ok.
   *
   * Callers handle pre-validation (resource availability, editor checks) and destination creation,
   * then delegate the common bind flow here.
   *
   * @param newDestination - The destination to bind
   * @param kind - The destination kind for result metadata and confirmation dialog
   */
  private async commitBind(
    newDestination: PasteDestination,
    kind: DestinationKind,
  ): Promise<ExtensionResult<BindSuccessInfo>> {
    const logCtx = { fn: 'PasteDestinationManager.commitBind', kind };

    if (this.boundDestination && (await this.boundDestination.equals(newDestination))) {
      this.logger.debug(
        { ...logCtx, displayName: newDestination.displayName },
        `Already bound to ${newDestination.displayName}, no action taken`,
      );
      this.vscodeAdapter.showInformationMessage(
        formatMessage(MessageCode.ALREADY_BOUND_TO_DESTINATION, {
          destinationName: newDestination.displayName,
        }),
      );
      return this.bindFailedResult(
        'commitBind',
        'Already bound to same destination',
        BindFailureReason.ALREADY_BOUND_TO_SAME,
      );
    }

    if (this.boundDestination) {
      const confirmed = await this.confirmReplaceBinding(
        this.boundDestination,
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

      this.replacedDestinationName = this.boundDestination.displayName;
      this.unbind();
    }

    await this.setBoundDestination(newDestination);

    this.logger.info(
      {
        ...logCtx,
        displayName: newDestination.displayName,
        ...newDestination.getLoggingDetails(),
      },
      `Successfully bound to "${newDestination.displayName}"`,
    );

    this.showBindSuccessToast(newDestination.displayName);

    return ExtensionResult.ok({
      destinationName: newDestination.displayName,
      destinationKind: kind,
    });
  }

  /**
   * Update internal state when binding a new destination.
   * Centralizes state mutation and context key management.
   *
   * @param destination - The destination to bind
   */
  private async setBoundDestination(destination: PasteDestination): Promise<void> {
    this.boundDestination = destination;
    await this.vscodeAdapter.executeCommand('setContext', CONTEXT_IS_BOUND, true);
  }

  /**
   * Clear internal state when unbinding.
   * Centralizes state mutation and context key management.
   */
  private clearBoundDestination(): void {
    this.boundDestination = undefined;
    void this.vscodeAdapter.executeCommand('setContext', CONTEXT_IS_BOUND, false);
  }

  /**
   * Setup document close listener for document closure detection
   *
   * **Lazy unbind strategy:**
   * - Only unbinds when bound document is actually closed (not just hidden)
   * - Allows user to move document between tab groups or switch to other files
   * - Paste automatically brings hidden document to foreground via showTextDocument()
   */
  private setupTextDocumentCloseListener(): void {
    const documentCloseDisposable = this.vscodeAdapter.onDidCloseTextDocument((closedDocument) => {
      if (!isEditorDestination(this.boundDestination)) {
        return;
      }

      const boundDocumentUri = this.boundDestination.resource.editor.document.uri;

      // Check if the closed document matches the bound document
      if (closedDocument.uri.toString() === boundDocumentUri.toString()) {
        // Document actually closed - auto-unbind
        const editorDisplayName = this.boundDestination.displayName || 'Unknown';
        this.logger.info(
          {
            fn: 'PasteDestinationManager.onDidCloseTextDocument',
            editorDisplayName,
            boundDocumentUri: boundDocumentUri.toString(),
          },
          `Bound document closed: ${editorDisplayName} - auto-unbinding`,
        );
        this.unbind();
        this.vscodeAdapter.setStatusBarMessage(
          formatMessage(MessageCode.BOUND_EDITOR_CLOSED_AUTO_UNBOUND),
        );
      }
    });

    this.context.subscriptions.push(documentCloseDisposable);
    this.disposables.push(documentCloseDisposable);
  }

  /**
   * Show toast notification for successful binding
   *
   * Displays detailed message if replacing an existing binding,
   * or standard success message for normal binding.
   *
   * @param newDestinationName - Display name of newly bound destination
   */
  private showBindSuccessToast(newDestinationName: string): void {
    const toastMessage = this.replacedDestinationName
      ? formatMessage(MessageCode.STATUS_BAR_DESTINATION_REBOUND, {
          previousDestination: this.replacedDestinationName,
          newDestination: newDestinationName,
        })
      : formatMessage(MessageCode.STATUS_BAR_DESTINATION_BOUND, {
          destinationName: newDestinationName,
        });

    this.vscodeAdapter.setStatusBarMessage(toastMessage);

    // Clear replacement tracking after use
    this.replacedDestinationName = undefined;
  }

  /**
   * Send content to bound destination and handle all feedback (status bar, toasts, errors).
   *
   * Shared helper for sendToDestination() and sendTextToDestination() to eliminate duplication.
   * Follows ChatAssistantDestination.sendTextToChat() pattern.
   *
   * **Feedback handling:**
   * - Success (automatic destinations): Status bar "✓ ${basicStatusMessage} and sent to ${displayName}"
   * - Success (clipboard destinations): Status bar + toast with getUserInstruction(AutoPasteResult.Success)
   * - Failure (clipboard destinations): Status bar + warning with getUserInstruction(AutoPasteResult.Failure)
   * - Failure (automatic destinations): Warning with buildPasteFailureMessage()
   *
   * @param options - Configuration for sending and feedback
   * @returns true if paste succeeded, false otherwise
   */
  private async sendWithFeedback(options: {
    basicStatusMessage: string;
    logContext: LoggingContext;
    debugMessage: (displayName: string) => string;
    errorMessage: (displayName: string) => string;
    execute: (destination: PasteDestination) => Promise<boolean>;
  }): Promise<boolean> {
    if (!this.boundDestination) {
      this.logger.debug(options.logContext, 'No destination bound');
      return false;
    }

    const destination = this.boundDestination;
    const displayName = destination.displayName || 'destination';

    // Build enhanced log context with destination details
    const enhancedLogContext: LoggingContext = {
      ...options.logContext,
      destinationKind: destination.id,
      displayName,
      ...destination.getLoggingDetails(),
    };

    this.logger.debug(enhancedLogContext, options.debugMessage(displayName));

    const pasteSucceeded = await options.execute(destination);

    if (pasteSucceeded) {
      const successInstruction = destination.getUserInstruction?.(AutoPasteResult.Success);

      if (successInstruction) {
        this.vscodeAdapter.setStatusBarMessage(options.basicStatusMessage);
        void this.vscodeAdapter.showInformationMessage(successInstruction);
      } else {
        const enhancedMessage = formatMessage(MessageCode.STATUS_BAR_LINK_SENT_TO_DESTINATION, {
          statusMessage: options.basicStatusMessage,
          destinationName: displayName,
        });
        this.vscodeAdapter.setStatusBarMessage(enhancedMessage);
      }

      return true;
    }

    const failureInstruction = destination.getUserInstruction?.(AutoPasteResult.Failure);

    if (failureInstruction) {
      this.vscodeAdapter.setStatusBarMessage(options.basicStatusMessage);
      void this.vscodeAdapter.showWarningMessage(failureInstruction);
    } else {
      const errorMsg = this.buildPasteFailureMessage(destination, options.basicStatusMessage);
      this.vscodeAdapter.showWarningMessage(errorMsg);
    }

    this.logger.error(enhancedLogContext, options.errorMessage(displayName));

    return false;
  }

  /**
   * Build destination-aware error message for paste failures
   *
   * Provides specific guidance for destinations that don't provide their own
   * manual fallback instructions via getUserInstruction().
   *
   * Note: Chat assistants (Claude Code, Cursor AI, GitHub Copilot) provide their own instructions
   * via getUserInstruction(AutoPasteResult.Failure), so they should never reach this method.
   *
   * @param destination - The destination that failed to receive the paste
   * @param basicStatusMessage - Base message to prepend to error
   * @returns User-friendly error message with destination-specific guidance
   * @throws RangeLinkExtensionError if called with unknown destination kind
   */
  private buildPasteFailureMessage(
    destination: PasteDestination,
    basicStatusMessage: string,
  ): string {
    switch (destination.id) {
      case 'text-editor':
        return formatMessage(MessageCode.WARN_PASTE_FAILED_EDITOR_HIDDEN, {
          statusMessage: basicStatusMessage,
        });

      case 'terminal':
        return formatMessage(MessageCode.WARN_PASTE_FAILED_TERMINAL, {
          statusMessage: basicStatusMessage,
        });

      case 'claude-code':
      case 'cursor-ai':
        // Chat assistants should provide getUserInstruction(AutoPasteResult.Failure)
        // and never reach this fallback method
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: `Chat assistant destination '${destination.id}' should provide getUserInstruction() and never reach buildPasteFailureMessage()`,
          functionName: 'PasteDestinationManager.buildPasteFailureMessage',
          details: { destinationId: destination.id, displayName: destination.displayName },
        });

      default:
        // Unknown destination kind - indicates missing switch case for new destination
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED,
          message: `Unknown destination kind '${destination.id}' - missing case in buildPasteFailureMessage()`,
          functionName: 'PasteDestinationManager.buildPasteFailureMessage',
          details: { destinationId: destination.id, displayName: destination.displayName },
        });
    }
  }

  private bindFailedResult(
    functionName: string,
    message: string,
    failedBindDetails?: BindFailureReason,
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

    const YES_REPLACE_LABEL = formatMessage(MessageCode.SMART_BIND_CONFIRM_YES_REPLACE);

    const items: vscode.QuickPickItem[] = [
      {
        label: YES_REPLACE_LABEL,
        description: formatMessage(MessageCode.SMART_BIND_CONFIRM_YES_DESCRIPTION, params),
      },
      {
        label: formatMessage(MessageCode.SMART_BIND_CONFIRM_NO_KEEP),
        description: formatMessage(MessageCode.SMART_BIND_CONFIRM_NO_DESCRIPTION, params),
      },
    ];

    const choice = await this.vscodeAdapter.showQuickPick(items, {
      placeHolder: formatMessage(MessageCode.SMART_BIND_CONFIRM_PLACEHOLDER, params),
    });

    const confirmed = choice?.label === YES_REPLACE_LABEL;

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
