import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../types/AutoPasteResult';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

import { DestinationFactory } from './DestinationFactory';
import type { DestinationType, PasteDestination } from './PasteDestination';
import { TextEditorDestination } from './TextEditorDestination';

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
  private boundDestination: PasteDestination | undefined;
  private boundTerminal: vscode.Terminal | undefined; // Track for closure events
  private disposables: vscode.Disposable[] = [];
  private replacedDestinationName: string | undefined; // Track for toast notifications

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly factory: DestinationFactory,
    private readonly vscodeAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {
    // Listen for terminal closure (terminal-only auto-unbind)
    this.setupTerminalCloseListener();
    // Listen for text document closure (text-editor-only auto-unbind)
    this.setupTextDocumentCloseListener();
  }

  /**
   * Bind to a destination type
   *
   * For terminal: requires active terminal via vscode.window.activeTerminal
   * For text-editor: requires active text editor via vscode.window.activeTextEditor
   * For AI assistants: checks destination.isAvailable() (e.g., Cursor IDE detection, Claude Code extension)
   *
   * **Centralized binding logic:**
   * 1. Create/validate new destination (resource-specific validation)
   * 2. Check if already bound to same destination using equals()
   * 3. If different destination bound, show confirmation
   * 4. Bind the new destination
   *
   * @param type - The destination type to bind (e.g., 'terminal', 'text-editor', 'cursor-ai', 'claude-code')
   * @returns true if binding succeeded, false otherwise
   */
  async bind(type: DestinationType): Promise<boolean> {
    // Special handling for terminal (needs active terminal reference)
    if (type === 'terminal') {
      return this.bindTerminal();
    }

    // Special handling for text editor (needs active text editor reference)
    if (type === 'text-editor') {
      return this.bindTextEditor();
    }

    // Generic destination binding (AI assistant destinations, etc.)
    return this.bindGenericDestination(type);
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
    this.boundDestination = undefined;
    this.boundTerminal = undefined;

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
   * Jump to (focus) the currently bound destination without performing a paste
   *
   * Brings the bound destination into focus/view for quick navigation.
   * Used by the "Jump to Bound Destination" command (issue #99).
   *
   * **Behavior:**
   * - No destination bound: Shows information message
   * - Terminal: Focuses terminal panel
   * - Text Editor: Focuses editor document (cursor stays at current position)
   * - AI Assistants: Opens/focuses chat interface
   *
   * @returns true if jump succeeded, false if no destination bound or focus failed
   */
  async jumpToBoundDestination(): Promise<boolean> {
    if (!this.boundDestination) {
      this.logger.debug(
        { fn: 'PasteDestinationManager.jumpToBoundDestination' },
        'No destination bound',
      );
      this.vscodeAdapter.showInformationMessage(
        formatMessage(MessageCode.INFO_JUMP_NO_DESTINATION_BOUND),
      );
      return false;
    }

    const destinationType = this.boundDestination.id;
    const displayName = this.boundDestination.displayName;

    const logCtx = {
      fn: 'PasteDestinationManager.jumpToBoundDestination',
      destinationType,
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
      return false;
    }

    // Success - show status bar message from destination
    const successMessage = this.boundDestination.getJumpSuccessMessage();
    this.vscodeAdapter.setStatusBarMessage(successMessage);

    this.logger.info(logCtx, `Successfully focused ${displayName}`);

    return true;
  }

  /**
   * Send a formatted RangeLink to bound destination with user feedback
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @param basicStatusMessage - Base message for status bar (e.g., "RangeLink copied to clipboard")
   * @returns true if sent successfully, false otherwise
   */
  async sendLinkToDestination(
    formattedLink: FormattedLink,
    basicStatusMessage: string,
  ): Promise<boolean> {
    return this.sendWithFeedback({
      basicStatusMessage,
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
   * Send text content to bound destination with user feedback
   *
   * Similar to sendToDestination() but for raw text content instead of FormattedLink.
   * Used for pasting selected text directly to bound destinations (issue #89).
   *
   * @param content - The text content to send
   * @param basicStatusMessage - Base message for status bar (e.g., "Text copied to clipboard")
   * @returns true if sent successfully, false otherwise
   */
  async sendTextToDestination(content: string, basicStatusMessage: string): Promise<boolean> {
    return this.sendWithFeedback({
      basicStatusMessage,
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
      if (this.boundTerminal === closedTerminal) {
        const terminalName = closedTerminal.name || 'Unnamed Terminal';
        this.logger.info(
          { fn: 'PasteDestinationManager.onDidCloseTerminal', terminalName },
          `Bound terminal closed: ${terminalName} - auto-unbinding`,
        );
        this.unbind();
        this.vscodeAdapter.setStatusBarMessage(
          formatMessage(MessageCode.STATUS_BAR_DESTINATION_BINDING_REMOVED_TERMINAL_CLOSED),
          3000,
        );
      }
    });

    this.context.subscriptions.push(terminalCloseDisposable);
    this.disposables.push(terminalCloseDisposable);
  }

  /**
   * Bind to terminal (special case requiring active terminal)
   *
   * @returns true if binding succeeded, false if no active terminal
   */
  private async bindTerminal(): Promise<boolean> {
    const activeTerminal = this.vscodeAdapter.activeTerminal;

    if (!activeTerminal) {
      this.logger.warn({ fn: 'PasteDestinationManager.bindTerminal' }, 'No active terminal');
      this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
      return false;
    }

    // Create new destination with resource
    const newDestination = this.factory.create({ type: 'terminal', terminal: activeTerminal });

    // Check if already bound to same destination using equals()
    if (this.boundDestination && (await this.boundDestination.equals(newDestination))) {
      this.logger.debug(
        { fn: 'PasteDestinationManager.bindTerminal', displayName: newDestination.displayName },
        `Already bound to ${newDestination.displayName}, no action taken`,
      );
      this.vscodeAdapter.showInformationMessage(
        formatMessage(MessageCode.ALREADY_BOUND_TO_DESTINATION, {
          destinationName: newDestination.displayName,
        }),
      );
      return false;
    }

    // If already bound to different destination, show confirmation dialog
    if (this.boundDestination) {
      const confirmed = await this.confirmReplaceBinding(
        this.boundDestination,
        'terminal',
        newDestination.displayName,
      );

      if (!confirmed) {
        this.logger.debug(
          { fn: 'PasteDestinationManager.bindTerminal' },
          'User cancelled binding replacement',
        );
        return false;
      }

      // User confirmed - track old destination and unbind
      this.replacedDestinationName = this.boundDestination.displayName;
      this.unbind();
    }

    // Bind new destination
    this.boundDestination = newDestination;
    this.boundTerminal = activeTerminal; // Track for closure events

    this.logger.info(
      { fn: 'PasteDestinationManager.bindTerminal', displayName: newDestination.displayName },
      `Successfully bound to "${newDestination.displayName}"`,
    );

    this.showBindSuccessToast(newDestination.displayName);

    return true;
  }

  /**
   * Bind to text editor (special case requiring active text editor)
   *
   * **MVP Requirements:**
   * - Requires 2+ tab groups (split editor)
   * - Active editor must be text-like file (not binary, not terminal)
   * - Active editor must have focus
   *
   * @returns true if binding succeeded, false if validation fails
   */
  private async bindTextEditor(): Promise<boolean> {
    // Validate: Require 2+ tab groups for split editor workflow
    const tabGroupCount = this.vscodeAdapter.tabGroups.all.length;
    if (tabGroupCount < 2) {
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindTextEditor', tabGroupCount },
        'Cannot bind: Requires 2+ tab groups',
      );
      this.vscodeAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TEXT_EDITOR_REQUIRES_SPLIT),
      );
      return false;
    }

    const activeEditor = this.vscodeAdapter.activeTextEditor;

    if (!activeEditor) {
      this.logger.warn({ fn: 'PasteDestinationManager.bindTextEditor' }, 'No active text editor');
      this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TEXT_EDITOR));
      return false;
    }

    // Check if editor is text-like (not binary)
    if (!TextEditorDestination.isTextLikeFile(this.vscodeAdapter, activeEditor)) {
      const fileName = activeEditor.document.uri.fsPath.split('/').pop() || 'Unknown';
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindTextEditor', fileName },
        'Cannot bind: Editor is not a text-like file',
      );
      this.vscodeAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TEXT_EDITOR_NOT_TEXT_LIKE, { fileName }),
      );
      return false;
    }

    // Create new destination with resource
    const newDestination = this.factory.create({
      type: 'text-editor',
      editor: activeEditor,
    }) as TextEditorDestination;

    // Check if already bound to same destination using equals()
    if (this.boundDestination && (await this.boundDestination.equals(newDestination))) {
      this.logger.debug(
        { fn: 'PasteDestinationManager.bindTextEditor', displayName: newDestination.displayName },
        `Already bound to ${newDestination.displayName}, no action taken`,
      );
      this.vscodeAdapter.showInformationMessage(
        formatMessage(MessageCode.ALREADY_BOUND_TO_DESTINATION, {
          destinationName: newDestination.displayName,
        }),
      );
      return false;
    }

    // If already bound to different destination, show confirmation dialog
    if (this.boundDestination) {
      const confirmed = await this.confirmReplaceBinding(
        this.boundDestination,
        'text-editor',
        newDestination.displayName,
      );

      if (!confirmed) {
        this.logger.debug(
          { fn: 'PasteDestinationManager.bindTextEditor' },
          'User cancelled binding replacement',
        );
        return false;
      }

      // User confirmed - track old destination and unbind
      this.replacedDestinationName = this.boundDestination.displayName;
      this.unbind();
    }

    // Bind new destination
    this.boundDestination = newDestination;

    this.logger.info(
      {
        fn: 'PasteDestinationManager.bindTextEditor',
        displayName: newDestination.displayName,
        editorPath: newDestination.editorPath,
        tabGroupCount,
      },
      `Successfully bound to "${newDestination.displayName}" (${tabGroupCount} tab groups)`,
    );

    this.showBindSuccessToast(newDestination.displayName);

    return true;
  }

  /**
   * Bind to generic destination (AI assistant destinations, etc.)
   *
   * @param type - The destination type (e.g., 'cursor-ai', 'claude-code', 'github-copilot')
   * @returns true if binding succeeded, false if destination not available
   */
  private async bindGenericDestination(type: DestinationType): Promise<boolean> {
    // Generic destinations don't require resources at construction
    const newDestination = this.factory.create({
      type: type as 'cursor-ai' | 'claude-code' | 'github-copilot',
    });

    // Check if destination is available (e.g., Cursor IDE detection, Claude Code extension)
    if (!(await newDestination.isAvailable())) {
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindGenericDestination', type },
        `Cannot bind: ${newDestination.displayName} not available`,
      );

      const messageCode =
        type === 'cursor-ai'
          ? MessageCode.ERROR_CURSOR_AI_NOT_AVAILABLE
          : MessageCode.ERROR_CLAUDE_CODE_NOT_AVAILABLE;

      this.vscodeAdapter.showErrorMessage(formatMessage(messageCode));

      return false;
    }

    // Check if already bound to same destination using equals()
    if (this.boundDestination && (await this.boundDestination.equals(newDestination))) {
      this.logger.debug(
        {
          fn: 'PasteDestinationManager.bindGenericDestination',
          displayName: newDestination.displayName,
        },
        `Already bound to ${newDestination.displayName}, no action taken`,
      );
      this.vscodeAdapter.showInformationMessage(
        formatMessage(MessageCode.ALREADY_BOUND_TO_DESTINATION, {
          destinationName: newDestination.displayName,
        }),
      );
      return false;
    }

    // If already bound to different destination, show confirmation dialog
    if (this.boundDestination) {
      const confirmed = await this.confirmReplaceBinding(
        this.boundDestination,
        type,
        newDestination.displayName,
      );

      if (!confirmed) {
        this.logger.debug(
          { fn: 'PasteDestinationManager.bindGenericDestination' },
          'User cancelled binding replacement',
        );
        return false;
      }

      // User confirmed - track old destination and unbind
      this.replacedDestinationName = this.boundDestination.displayName;
      this.unbind();
    }

    // Bind new destination
    this.boundDestination = newDestination;

    this.logger.info(
      {
        fn: 'PasteDestinationManager.bindGenericDestination',
        displayName: newDestination.displayName,
      },
      `Successfully bound to ${newDestination.displayName}`,
    );

    this.showBindSuccessToast(newDestination.displayName);

    return true;
  }

  /**
   * Setup document close listener for document closure detection
   *
   * **Lazy unbind strategy:**
   * - Only unbinds when bound document is actually closed (not just hidden)
   * - Allows user to move document between tab groups or switch to other files
   * - Paste attempt will show "not topmost" warning if document exists but not visible
   */
  private setupTextDocumentCloseListener(): void {
    const documentCloseDisposable = this.vscodeAdapter.onDidCloseTextDocument((closedDocument) => {
      // Only check if we have a text editor destination bound
      if (!this.boundDestination || this.boundDestination.id !== 'text-editor') {
        return;
      }

      const textEditorDest = this.boundDestination as TextEditorDestination;
      const boundDocumentUri = textEditorDest.getBoundDocumentUri();

      if (!boundDocumentUri) {
        return;
      }

      // Check if the closed document matches the bound document
      if (closedDocument.uri.toString() === boundDocumentUri.toString()) {
        // Document actually closed - auto-unbind
        const editorDisplayName = textEditorDest.displayName || 'Unknown';
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

    this.vscodeAdapter.setStatusBarMessage(toastMessage, 3000);

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
      destinationType: destination.id,
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
        const enhancedMessage = `✓ ${options.basicStatusMessage} & sent to ${displayName}`;
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
   * @throws RangeLinkExtensionError if called with unknown destination type
   */
  private buildPasteFailureMessage(
    destination: PasteDestination,
    basicStatusMessage: string,
  ): string {
    switch (destination.id) {
      case 'text-editor':
        return `${basicStatusMessage} Bound editor is hidden behind other tabs - make it active to resume auto-paste.`;

      case 'terminal':
        return `${basicStatusMessage} Could not send to terminal. Terminal may be closed or not accepting input.`;

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
        // Unknown destination type - indicates missing switch case for new destination
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED,
          message: `Unknown destination type '${destination.id}' - missing case in buildPasteFailureMessage()`,
          functionName: 'PasteDestinationManager.buildPasteFailureMessage',
          details: { destinationId: destination.id, displayName: destination.displayName },
        });
    }
  }

  /**
   * Show confirmation dialog for replacing existing binding
   *
   * Uses QuickPick with descriptive labels to confirm user intent.
   * User can confirm replacement or cancel to keep current binding.
   *
   * @param currentDestination - Currently bound destination
   * @param newType - Destination type user wants to bind
   * @param newDisplayName - Display name of new destination
   * @returns true if user confirms replacement, false if cancelled
   */
  private async confirmReplaceBinding(
    currentDestination: PasteDestination,
    newType: DestinationType,
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
        currentType: currentDestination.id,
        newType,
        confirmed,
      },
      confirmed ? 'User confirmed replacement' : 'User cancelled replacement',
    );

    return confirmed;
  }
}
