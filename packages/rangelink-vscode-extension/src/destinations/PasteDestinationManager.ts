import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { CONTEXT_IS_BOUND } from '../constants';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  AutoPasteResult,
  BindAbortReason,
  MessageCode,
  QuickPickBindResult,
  type TerminalBindResult,
} from '../types';
import {
  formatMessage,
  isBinaryFile,
  isEditorDestination,
  isWritableScheme,
  type PaddingMode,
} from '../utils';

import type { DestinationAvailabilityService } from './DestinationAvailabilityService';
import type { DestinationRegistry } from './DestinationRegistry';
import type {
  AIAssistantDestinationType,
  DestinationType,
  PasteDestination,
} from './PasteDestination';

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
   * Static lookup table mapping AI assistant destination types to unavailable error message codes
   */
  private static readonly AI_ASSISTANT_ERROR_CODES: Record<
    AIAssistantDestinationType,
    MessageCode
  > = {
    'claude-code': MessageCode.ERROR_CLAUDE_CODE_NOT_AVAILABLE,
    'cursor-ai': MessageCode.ERROR_CURSOR_AI_NOT_AVAILABLE,
    'github-copilot-chat': MessageCode.ERROR_GITHUB_COPILOT_CHAT_NOT_AVAILABLE,
  };

  private boundDestination: PasteDestination | undefined;
  private boundTerminal: vscode.Terminal | undefined; // Track for closure events
  private disposables: vscode.Disposable[] = [];
  private replacedDestinationName: string | undefined; // Track for toast notifications

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly registry: DestinationRegistry,
    private readonly availabilityService: DestinationAvailabilityService,
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
    // TODO: Replace bind(type) signature with bind(options: BindOptions) discriminated union.
    // Options should include { type: 'terminal', terminal: vscode.Terminal } so callers
    // pass the terminal directly. This avoids circular dependency with BindToTerminalCommand.
    // See backup branch issues/255-backup for reference implementation.
    if (type === 'terminal') {
      const activeTerminal = this.vscodeAdapter.activeTerminal;
      if (!activeTerminal) {
        this.logger.warn({ fn: 'PasteDestinationManager.bind' }, 'No active terminal');
        this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
        return false;
      }
      const result = await this.bindTerminal(activeTerminal);
      return result.outcome === 'bound';
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
   * Jump to (focus) the currently bound destination without performing a paste
   *
   * Brings the bound destination into focus/view for quick navigation.
   *
   * **Behavior:**
   * - No destination bound: Shows quick pick of available destinations
   * - Terminal: Focuses terminal panel
   * - Text Editor: Focuses editor document (cursor stays at current position)
   * - AI Assistants: Opens/focuses chat interface
   *
   * @returns true if jump succeeded, false if no destination bound/selected or focus failed
   */
  async jumpToBoundDestination(): Promise<boolean> {
    if (!this.boundDestination) {
      return this.showDestinationQuickPickAndJump();
    }

    return this.focusBoundDestination();
  }

  /**
   * Bind to a destination type and immediately jump to it.
   *
   * Convenience method that combines bind() and jumpToBoundDestination().
   *
   * @param type - The destination type to bind and jump to
   * @returns true if bind and jump both succeeded, false otherwise
   */
  async bindAndJump(type: DestinationType): Promise<boolean> {
    const bound = await this.bind(type);
    if (!bound) {
      return false;
    }
    return this.jumpToBoundDestination();
  }

  /**
   * Show quick pick of available destinations for R-V (Paste to Destination).
   * Only binds to selected destination - caller handles the actual paste.
   *
   * @returns true if binding succeeded, false if cancelled/failed/no destinations
   */
  async showDestinationQuickPickForPaste(): Promise<QuickPickBindResult> {
    return this.showDestinationQuickPickAndBind(
      MessageCode.INFO_PASTE_CONTENT_NO_DESTINATIONS_AVAILABLE,
      MessageCode.INFO_PASTE_CONTENT_QUICK_PICK_DESTINATIONS_CHOOSE_BELOW,
      { fn: 'PasteDestinationManager.showDestinationQuickPickForPaste' },
    );
  }

  /**
   * Show quick pick of available destinations and bind to selected one.
   * Common logic shared by jump and paste flows.
   *
   * @param noDestinationsMessageCode - Message to show when no destinations available
   * @param quickPickPlaceholderMessageCode - Placeholder text for quick pick
   * @param callerContext - Logging context from caller (fn will be extended with ::showDestinationQuickPickAndBind)
   * @returns Rich result indicating binding outcome
   */
  private async showDestinationQuickPickAndBind(
    noDestinationsMessageCode: MessageCode,
    quickPickPlaceholderMessageCode: MessageCode,
    callerContext: LoggingContext,
  ): Promise<QuickPickBindResult> {
    const logCtx = { ...callerContext, fn: `${callerContext.fn}::showDestinationQuickPickAndBind` };

    this.logger.debug(logCtx, 'No destination bound, showing quick pick');

    const availableDestinations = await this.availabilityService.getAvailableDestinations();

    if (availableDestinations.length === 0) {
      this.logger.debug(logCtx, 'No destinations available');
      await this.vscodeAdapter.showInformationMessage(formatMessage(noDestinationsMessageCode));
      return QuickPickBindResult.NoDestinationsAvailable;
    }

    const items = availableDestinations.map((dest) => ({
      label: dest.displayName,
      destinationType: dest.type,
    }));

    this.logger.debug(
      { ...logCtx, availableCount: items.length },
      `Showing quick pick with ${items.length} destinations`,
    );

    const selected = await this.vscodeAdapter.showQuickPick(items, {
      placeHolder: formatMessage(quickPickPlaceholderMessageCode),
    });

    if (!selected) {
      this.logger.debug(logCtx, 'User cancelled quick pick');
      return QuickPickBindResult.Cancelled;
    }

    this.logger.debug(
      { ...logCtx, selectedType: selected.destinationType },
      `User selected ${selected.destinationType}`,
    );

    const bound = await this.bind(selected.destinationType);
    if (!bound) {
      this.logger.debug(logCtx, 'Binding failed');
      return QuickPickBindResult.BindingFailed;
    }
    return QuickPickBindResult.Bound;
  }

  /**
   * Show quick pick of available destinations when no destination is bound.
   * Binds AND jumps to selected destination in one action.
   */
  private async showDestinationQuickPickAndJump(): Promise<boolean> {
    const result = await this.showDestinationQuickPickAndBind(
      MessageCode.INFO_JUMP_NO_DESTINATIONS_AVAILABLE,
      MessageCode.INFO_JUMP_QUICK_PICK_PLACEHOLDER,
      { fn: 'PasteDestinationManager.showDestinationQuickPickAndJump' },
    );

    if (result !== QuickPickBindResult.Bound) {
      return false;
    }

    return this.focusBoundDestination();
  }

  /**
   * Focus the currently bound destination
   */
  private async focusBoundDestination(): Promise<boolean> {
    if (!this.boundDestination) {
      return false;
    }

    const destinationType = this.boundDestination.id;
    const displayName = this.boundDestination.displayName;

    const logCtx = {
      fn: 'PasteDestinationManager.focusBoundDestination',
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
   * Bind to a specific terminal.
   *
   * @param terminal - The terminal to bind to
   * @returns TerminalBindResult with outcome and details
   */
  async bindTerminal(terminal: vscode.Terminal): Promise<TerminalBindResult> {
    const logCtx = { fn: 'PasteDestinationManager.bindTerminal' };

    // Create new destination with resource
    const newDestination = this.registry.create({ type: 'terminal', terminal });

    // Check if already bound to same destination using equals()
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
      return {
        outcome: 'aborted',
        reason: BindAbortReason.ALREADY_BOUND_TO_SAME,
      };
    }

    // If already bound to different destination, show confirmation dialog
    if (this.boundDestination) {
      const confirmed = await this.confirmReplaceBinding(
        this.boundDestination,
        'terminal',
        newDestination.displayName,
      );

      if (!confirmed) {
        this.logger.debug(logCtx, 'User declined binding replacement');
        return {
          outcome: 'aborted',
          reason: BindAbortReason.USER_DECLINED_REPLACEMENT,
        };
      }

      // User confirmed - track old destination and unbind
      this.replacedDestinationName = this.boundDestination.displayName;
      this.unbind();
    }

    await this.setBoundDestination(newDestination, terminal);

    this.logger.info(
      {
        ...logCtx,
        displayName: newDestination.displayName,
        ...newDestination.getLoggingDetails(),
      },
      `Successfully bound to "${newDestination.displayName}"`,
    );

    this.showBindSuccessToast(newDestination.displayName);

    return {
      outcome: 'bound',
      details: { terminalName: newDestination.displayName },
    };
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
   * @returns true if binding succeeded, false if validation fails
   */
  private async bindTextEditor(): Promise<boolean> {
    const activeEditor = this.vscodeAdapter.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn({ fn: 'PasteDestinationManager.bindTextEditor' }, 'No active text editor');
      this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TEXT_EDITOR));
      return false;
    }

    // Extract URI properties for logging and validation
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
      return false;
    }

    if (isBinaryFile(scheme, fsPath)) {
      this.logger.warn(logCtx, 'Cannot bind: Editor is a binary file');
      this.vscodeAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_TEXT_EDITOR_BINARY_FILE, { fileName }),
      );
      return false;
    }

    // Create new destination with resource
    const newDestination = this.registry.create({
      type: 'text-editor',
      editor: activeEditor,
    });

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

    await this.setBoundDestination(newDestination);

    this.logger.info(
      {
        fn: 'PasteDestinationManager.bindTextEditor',
        displayName: newDestination.displayName,
        ...newDestination.getLoggingDetails(),
      },
      `Successfully bound to "${newDestination.displayName}"`,
    );

    this.showBindSuccessToast(newDestination.displayName);

    return true;
  }

  /**
   * Bind to generic destination (AI assistant destinations, etc.)
   *
   * @param type - The destination type (AI assistants only)
   * @returns true if binding succeeded, false if destination not available
   */
  private async bindGenericDestination(type: AIAssistantDestinationType): Promise<boolean> {
    // Generic destinations don't require resources at construction
    const newDestination = this.registry.create({ type });

    // Check if destination is available
    if (!(await newDestination.isAvailable())) {
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindGenericDestination', type },
        `Cannot bind: ${newDestination.displayName} not available`,
      );

      // Lookup error message code from static table with runtime safety fallback
      const messageCode =
        PasteDestinationManager.AI_ASSISTANT_ERROR_CODES[type] ??
        (() => {
          // Exhaustiveness check - should never happen due to compile-time Record type checking
          throw new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
            message: `Unhandled AI assistant destination type: ${type}`,
            functionName: 'PasteDestinationManager.bindGenericDestination',
            details: { type },
          });
        })();

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

    await this.setBoundDestination(newDestination);

    this.logger.info(
      {
        fn: 'PasteDestinationManager.bindGenericDestination',
        displayName: newDestination.displayName,
        ...newDestination.getLoggingDetails(),
      },
      `Successfully bound to ${newDestination.displayName}`,
    );

    this.showBindSuccessToast(newDestination.displayName);

    return true;
  }

  /**
   * Update internal state when binding a new destination.
   * Centralizes state mutation and context key management.
   *
   * @param destination - The destination to bind
   * @param terminal - Optional terminal reference (only for terminal destinations)
   */
  private async setBoundDestination(
    destination: PasteDestination,
    terminal?: vscode.Terminal,
  ): Promise<void> {
    this.boundDestination = destination;
    this.boundTerminal = terminal;
    await this.vscodeAdapter.executeCommand('setContext', CONTEXT_IS_BOUND, true);
  }

  /**
   * Clear internal state when unbinding.
   * Centralizes state mutation and context key management.
   */
  private clearBoundDestination(): void {
    this.boundDestination = undefined;
    this.boundTerminal = undefined;
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
   * @throws RangeLinkExtensionError if called with unknown destination type
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
