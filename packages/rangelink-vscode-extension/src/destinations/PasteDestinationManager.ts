import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

import { DestinationFactory } from './DestinationFactory';
import type { DestinationType, PasteDestination } from './PasteDestination';
import { TerminalDestination } from './TerminalDestination';
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
    private readonly ideAdapter: VscodeAdapter,
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
   * @param type - The destination type to bind (e.g., 'terminal', 'text-editor', 'cursor-ai', 'claude-code')
   * @returns true if binding succeeded, false otherwise
   */
  async bind(type: DestinationType): Promise<boolean> {
    // Check if already bound
    if (this.boundDestination) {
      // Prevent binding same destination to itself
      if (this.boundDestination.id === type) {
        this.logger.debug(
          { fn: 'PasteDestinationManager.bind', type },
          `Already bound to ${this.boundDestination.displayName}, no action taken`,
        );
        this.ideAdapter.showInformationMessage(
          `RangeLink: Already bound to ${this.boundDestination.displayName}`,
        );
        return false;
      }

      // Get new destination display name for confirmation
      const newDestination = this.factory.create(type);
      const newDisplayName = newDestination.displayName;

      // Show confirmation dialog
      const confirmed = await this.confirmReplaceBinding(
        this.boundDestination,
        type,
        newDisplayName,
      );

      if (!confirmed) {
        this.logger.debug(
          {
            fn: 'PasteDestinationManager.bind',
            currentType: this.boundDestination.id,
            newType: type,
          },
          'User cancelled binding replacement',
        );
        return false;
      }

      // User confirmed - track old destination for toast notification
      this.replacedDestinationName = this.boundDestination.displayName;

      // Unbind current destination
      this.logger.info(
        { fn: 'PasteDestinationManager.bind', oldType: this.boundDestination.id, newType: type },
        `User confirmed replacement: unbinding ${this.replacedDestinationName}`,
      );
      this.unbind();
    }

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
      this.ideAdapter.setStatusBarMessage('RangeLink: No destination bound', 2000);
      return;
    }

    const displayName = this.boundDestination.displayName;
    this.boundDestination = undefined;
    this.boundTerminal = undefined;

    this.logger.info(
      { fn: 'PasteDestinationManager.unbind', displayName },
      `Successfully unbound from ${displayName}`,
    );

    this.ideAdapter.setStatusBarMessage(`✓ RangeLink unbound from ${displayName}`, 2000);
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
   * Send text to bound destination
   *
   * @param text - The text to paste
   * @returns true if sent successfully, false otherwise
   */
  async sendToDestination(text: string): Promise<boolean> {
    if (!this.boundDestination) {
      this.logger.debug(
        { fn: 'PasteDestinationManager.sendToDestination' },
        'No destination bound',
      );
      return false;
    }

    const destinationType = this.boundDestination.id;
    const displayName = this.boundDestination.displayName;

    // Get destination-specific details for logging
    let destinationDetails: Record<string, unknown> = {};
    if (destinationType === 'text-editor') {
      const textEditorDest = this.boundDestination as TextEditorDestination;
      destinationDetails = {
        editorDisplayName: textEditorDest.getEditorDisplayName(),
        editorPath: textEditorDest.getEditorPath(),
      };
    } else if (destinationType === 'terminal' && this.boundTerminal) {
      destinationDetails = {
        terminalName: this.boundTerminal.name || 'Unnamed Terminal',
      };
    }

    this.logger.debug(
      {
        fn: 'PasteDestinationManager.sendToDestination',
        destinationType,
        displayName,
        ...destinationDetails,
      },
      `Sending text to ${displayName}`,
    );

    const result = await this.boundDestination.paste(text);

    if (!result) {
      this.logger.error(
        {
          fn: 'PasteDestinationManager.sendToDestination',
          destinationType,
          displayName,
          ...destinationDetails,
        },
        `Paste failed to ${displayName}`,
      );
    }

    return result;
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
    const terminalCloseDisposable = this.ideAdapter.onDidCloseTerminal((closedTerminal) => {
      if (this.boundTerminal === closedTerminal) {
        const terminalName = closedTerminal.name || 'Unnamed Terminal';
        this.logger.info(
          { fn: 'PasteDestinationManager.onDidCloseTerminal', terminalName },
          `Bound terminal closed: ${terminalName} - auto-unbinding`,
        );
        this.unbind();
        this.ideAdapter.setStatusBarMessage('Destination binding removed (terminal closed)', 3000);
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
    const activeTerminal = this.ideAdapter.activeTerminal;

    if (!activeTerminal) {
      this.logger.warn({ fn: 'PasteDestinationManager.bindTerminal' }, 'No active terminal');
      this.ideAdapter.showErrorMessage(
        'RangeLink: No active terminal. Open a terminal and try again.',
      );
      return false;
    }

    const terminalName = activeTerminal.name || 'Unnamed Terminal';

    // Create terminal destination and set terminal reference
    const destination = this.factory.create('terminal') as TerminalDestination;
    destination.setTerminal(activeTerminal);

    this.boundDestination = destination;
    this.boundTerminal = activeTerminal; // Track for closure events

    this.logger.info(
      { fn: 'PasteDestinationManager.bindTerminal', terminalName },
      `Successfully bound to terminal: ${terminalName}`,
    );

    this.showBindSuccessToast(terminalName);

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
    const tabGroupCount = this.ideAdapter.tabGroups.all.length;
    if (tabGroupCount < 2) {
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindTextEditor', tabGroupCount },
        'Cannot bind: Requires 2+ tab groups',
      );
      this.ideAdapter.showErrorMessage(
        'RangeLink: Text editor binding requires split editor (2+ tab groups). Split your editor and try again.',
      );
      return false;
    }

    const activeEditor = this.ideAdapter.activeTextEditor;

    if (!activeEditor) {
      this.logger.warn({ fn: 'PasteDestinationManager.bindTextEditor' }, 'No active text editor');
      this.ideAdapter.showErrorMessage(
        'RangeLink: No active text editor. Open a file and try again.',
      );
      return false;
    }

    // Check if editor is text-like (not binary)
    if (!TextEditorDestination.isTextLikeFile(activeEditor)) {
      const fileName = activeEditor.document.uri.fsPath.split('/').pop() || 'Unknown';
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindTextEditor', fileName },
        'Cannot bind: Editor is not a text-like file',
      );
      this.ideAdapter.showErrorMessage(
        `RangeLink: Cannot bind to ${fileName} - not a text-like file (binary or special scheme)`,
      );
      return false;
    }

    // Create text editor destination and store document URI
    const destination = this.factory.create('text-editor') as TextEditorDestination;
    destination.setEditor(activeEditor);

    this.boundDestination = destination;

    const editorDisplayName = destination.getEditorDisplayName() || 'Unknown';
    const editorPath = destination.getEditorPath();

    this.logger.info(
      {
        fn: 'PasteDestinationManager.bindTextEditor',
        editorDisplayName,
        editorPath,
        tabGroupCount,
      },
      `Successfully bound to text editor: ${editorDisplayName} (${tabGroupCount} tab groups)`,
    );

    this.showBindSuccessToast(editorDisplayName);

    return true;
  }

  /**
   * Bind to generic destination (AI assistant destinations, etc.)
   *
   * @param type - The destination type (e.g., 'cursor-ai', 'claude-code', 'github-copilot')
   * @returns true if binding succeeded, false if destination not available
   */
  private async bindGenericDestination(type: DestinationType): Promise<boolean> {
    const destination = this.factory.create(type);

    // Check if destination is available (e.g., Cursor IDE detection, Claude Code extension)
    if (!(await destination.isAvailable())) {
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindGenericDestination', type },
        `Cannot bind: ${destination.displayName} not available`,
      );

      this.ideAdapter.showErrorMessage(
        `RangeLink: Cannot bind ${destination.displayName} - not running in ${destination.displayName.replace(' Assistant', '')} IDE`,
      );

      return false;
    }

    // Bind
    this.boundDestination = destination;

    this.logger.info(
      { fn: 'PasteDestinationManager.bindGenericDestination', type },
      `Successfully bound to ${destination.displayName}`,
    );

    this.showBindSuccessToast(destination.displayName);

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
    const documentCloseDisposable = this.ideAdapter.onDidCloseTextDocument((closedDocument) => {
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
        const editorDisplayName = textEditorDest.getEditorDisplayName() || 'Unknown';
        this.logger.info(
          {
            fn: 'PasteDestinationManager.onDidCloseTextDocument',
            editorDisplayName,
            boundDocumentUri: boundDocumentUri.toString(),
          },
          `Bound document closed: ${editorDisplayName} - auto-unbinding`,
        );
        this.unbind();
        this.ideAdapter.showInformationMessage(`RangeLink: Bound editor closed. Unbound.`);
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
      ? `Unbound ${this.replacedDestinationName}, now bound to ${newDestinationName}`
      : `✓ RangeLink bound to ${newDestinationName}`;

    this.ideAdapter.setStatusBarMessage(toastMessage, 3000);

    // Clear replacement tracking after use
    this.replacedDestinationName = undefined;
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

    const choice = await this.ideAdapter.showQuickPick(items, {
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
