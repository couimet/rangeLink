import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import { DestinationFactory } from './DestinationFactory';
import type { DestinationType, PasteDestination } from './PasteDestination';
import { TerminalDestination } from './TerminalDestination';
import { TextEditorDestination } from './TextEditorDestination';

/**
 * Unified destination manager for RangeLink (Phase 3)
 *
 * Manages binding to any paste destination (terminals, chat assistants, etc.)
 * Replaces TerminalBindingManager and ChatDestinationManager with single unified system.
 *
 * **Design:**
 * - Only one destination bound at a time (terminal OR chat, not both)
 * - Terminal binding requires active terminal reference
 * - Chat destinations use availability check (e.g., Cursor IDE detection)
 * - Terminal-only auto-unbind on terminal close (different semantics)
 * - No state persistence across reloads (same as legacy behavior)
 */
export class PasteDestinationManager implements vscode.Disposable {
  private boundDestination: PasteDestination | undefined;
  private boundTerminal: vscode.Terminal | undefined; // Track for closure events
  private boundEditor: vscode.TextEditor | undefined; // Track for closure events
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly factory: DestinationFactory,
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
   * For chat: checks destination.isAvailable() (e.g., Cursor IDE detection)
   *
   * @param type - The destination type to bind (e.g., 'terminal', 'text-editor', 'cursor-ai')
   * @returns true if binding succeeded, false otherwise
   */
  async bind(type: DestinationType): Promise<boolean> {
    // Check if already bound
    if (this.boundDestination) {
      const currentType = this.boundDestination.id;
      this.logger.warn(
        { fn: 'PasteDestinationManager.bind', currentType, requestedType: type },
        `Already bound to ${this.boundDestination.displayName}`,
      );

      vscode.window.showErrorMessage(
        `RangeLink: Already bound to ${this.boundDestination.displayName}. Unbind first.`,
      );

      return false;
    }

    // Special handling for terminal (needs active terminal reference)
    if (type === 'terminal') {
      return this.bindTerminal();
    }

    // Special handling for text editor (needs active text editor reference)
    if (type === 'text-editor') {
      return this.bindTextEditor();
    }

    // Generic destination binding (chat destinations, etc.)
    return this.bindGenericDestination(type);
  }

  /**
   * Unbind current destination
   */
  unbind(): void {
    if (!this.boundDestination) {
      this.logger.info({ fn: 'PasteDestinationManager.unbind' }, 'No destination bound');
      vscode.window.setStatusBarMessage('RangeLink: No destination bound', 2000);
      return;
    }

    const displayName = this.boundDestination.displayName;
    this.boundDestination = undefined;
    this.boundTerminal = undefined;
    this.boundEditor = undefined;

    this.logger.info(
      { fn: 'PasteDestinationManager.unbind', displayName },
      `Successfully unbound from ${displayName}`,
    );

    vscode.window.setStatusBarMessage(`✓ RangeLink unbound from ${displayName}`, 2000);
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

    const result = await this.boundDestination.paste(text);

    if (!result) {
      this.logger.error(
        {
          fn: 'PasteDestinationManager.sendToDestination',
          destinationType: this.boundDestination.id,
        },
        'Paste failed',
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
   * Chat destinations don't need this (persistent across extension lifecycle).
   */
  private setupTerminalCloseListener(): void {
    const terminalCloseDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (this.boundTerminal === closedTerminal) {
        const terminalName = closedTerminal.name || 'Unnamed Terminal';
        this.logger.info(
          { fn: 'PasteDestinationManager.onDidCloseTerminal', terminalName },
          `Bound terminal closed: ${terminalName} - auto-unbinding`,
        );
        this.unbind();
        vscode.window.setStatusBarMessage('Destination binding removed (terminal closed)', 3000);
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
    const activeTerminal = vscode.window.activeTerminal;

    if (!activeTerminal) {
      this.logger.warn({ fn: 'PasteDestinationManager.bindTerminal' }, 'No active terminal');
      vscode.window.showErrorMessage(
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

    vscode.window.setStatusBarMessage(`✓ RangeLink bound to ${terminalName}`, 3000);

    return true;
  }

  /**
   * Bind to text editor (special case requiring active text editor)
   *
   * @returns true if binding succeeded, false if no active text editor or not text-like file
   */
  private async bindTextEditor(): Promise<boolean> {
    const activeEditor = vscode.window.activeTextEditor;

    if (!activeEditor) {
      this.logger.warn({ fn: 'PasteDestinationManager.bindTextEditor' }, 'No active text editor');
      vscode.window.showErrorMessage(
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
      vscode.window.showErrorMessage(
        `RangeLink: Cannot bind to ${fileName} - not a text-like file (binary or special scheme)`,
      );
      return false;
    }

    // Create text editor destination and set editor reference
    const destination = this.factory.create('text-editor') as TextEditorDestination;
    destination.setEditor(activeEditor);

    this.boundDestination = destination;
    this.boundEditor = activeEditor; // Track for closure events

    const editorDisplayName = destination.getEditorDisplayName() || 'Unknown';
    const editorPath = destination.getEditorPath();

    this.logger.info(
      { fn: 'PasteDestinationManager.bindTextEditor', editorDisplayName, editorPath },
      `Successfully bound to text editor: ${editorDisplayName}`,
    );

    vscode.window.setStatusBarMessage(`✓ RangeLink bound to ${editorDisplayName}`, 3000);

    return true;
  }

  /**
   * Bind to generic destination (chat destinations, etc.)
   *
   * @param type - The destination type (e.g., 'cursor-ai', 'github-copilot')
   * @returns true if binding succeeded, false if destination not available
   */
  private async bindGenericDestination(type: DestinationType): Promise<boolean> {
    const destination = this.factory.create(type);

    // Check if destination is available (e.g., Cursor IDE detection)
    if (!(await destination.isAvailable())) {
      this.logger.warn(
        { fn: 'PasteDestinationManager.bindGenericDestination', type },
        `Cannot bind: ${destination.displayName} not available`,
      );

      vscode.window.showErrorMessage(
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

    vscode.window.setStatusBarMessage(`✓ RangeLink bound to ${destination.displayName}`, 3000);

    return true;
  }

  /**
   * Setup text document closure listener for auto-unbind
   *
   * Text-editor-only behavior: auto-unbind when document closes.
   * Similar to terminal closure behavior.
   */
  private setupTextDocumentCloseListener(): void {
    const documentCloseDisposable = vscode.workspace.onDidCloseTextDocument((closedDocument) => {
      if (this.boundEditor && this.boundEditor.document === closedDocument) {
        const editorDisplayName =
          (this.boundDestination as TextEditorDestination).getEditorDisplayName() || 'Unknown';
        this.logger.info(
          { fn: 'PasteDestinationManager.onDidCloseTextDocument', editorDisplayName },
          `Bound text editor closed: ${editorDisplayName} - auto-unbinding`,
        );
        this.unbind();
        vscode.window.setStatusBarMessage('Destination binding removed (editor closed)', 3000);
      }
    });

    this.context.subscriptions.push(documentCloseDisposable);
    this.disposables.push(documentCloseDisposable);
  }
}
