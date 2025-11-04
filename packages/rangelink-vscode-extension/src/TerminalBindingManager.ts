import { getLogger } from 'rangelink-core-ts';
import * as vscode from 'vscode';

/**
 * Manages terminal binding state for RangeLink
 * Handles binding/unbinding terminals and sending links to bound terminals
 */
export class TerminalBindingManager {
  private boundTerminal: vscode.Terminal | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    // Listen for terminal closure events
    const terminalCloseDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (this.boundTerminal === closedTerminal) {
        const terminalName = this.getTerminalDisplayName(closedTerminal);
        getLogger().info(
          { fn: 'onDidCloseTerminal', terminalName },
          `Bound terminal closed: ${terminalName} - auto-unbinding`,
        );
        this.unbind();
        vscode.window.setStatusBarMessage('Terminal binding removed (terminal closed)', 3000);
      }
    });

    context.subscriptions.push(terminalCloseDisposable);
    this.disposables.push(terminalCloseDisposable);
  }

  /**
   * Binds to the currently active terminal
   * @returns true if binding succeeded, false otherwise
   */
  bind(): boolean {
    const activeTerminal = vscode.window.activeTerminal;

    if (!activeTerminal) {
      getLogger().warn({ fn: 'bind' }, 'Failed to bind: No active terminal');
      vscode.window.showErrorMessage(
        'RangeLink: No active terminal. Open a terminal and try again.',
      );
      return false;
    }

    const terminalName = this.getTerminalDisplayName(activeTerminal);

    // Check if already bound
    if (this.boundTerminal) {
      const currentTerminalName = this.getTerminalDisplayName(this.boundTerminal);
      getLogger().warn(
        { fn: 'bind', currentTerminal: currentTerminalName, requestedTerminal: terminalName },
        'Already bound to a terminal',
      );
      vscode.window.showErrorMessage(
        `RangeLink: Already bound to ${currentTerminalName}. Unbind first to bind to a different terminal.`,
      );
      return false;
    }

    this.boundTerminal = activeTerminal;
    getLogger().info(
      { fn: 'bind', terminalName },
      `Successfully bound to terminal: ${terminalName}`,
    );
    vscode.window.setStatusBarMessage(`✓ RangeLink bound to ${terminalName}`, 3000);

    return true;
  }

  /**
   * Unbinds from the currently bound terminal
   */
  unbind(): void {
    if (!this.boundTerminal) {
      getLogger().info({ fn: 'unbind' }, 'No terminal bound, nothing to unbind');
      vscode.window.setStatusBarMessage('RangeLink: No terminal bound', 2000);
      return;
    }

    const terminalName = this.getTerminalDisplayName(this.boundTerminal);
    this.boundTerminal = undefined;

    getLogger().info(
      { fn: 'unbind', terminalName },
      `Successfully unbound from terminal: ${terminalName}`,
    );
    vscode.window.setStatusBarMessage(`✓ RangeLink unbound from ${terminalName}`, 2000);
  }

  /**
   * Checks if a terminal is currently bound
   */
  isBound(): boolean {
    return this.boundTerminal !== undefined;
  }

  /**
   * Gets the currently bound terminal (if any)
   */
  getBoundTerminal(): vscode.Terminal | undefined {
    return this.boundTerminal;
  }

  /**
   * Sends text to the bound terminal (if one is bound)
   * @param text The text to send
   * @returns true if text was sent, false if no terminal is bound
   */
  sendToTerminal(text: string): boolean {
    if (!this.boundTerminal) {
      getLogger().warn(
        { fn: 'sendToTerminal', textLength: text.length },
        'Cannot send to terminal: No terminal is bound',
      );
      return false;
    }

    const terminalName = this.getTerminalDisplayName(this.boundTerminal);
    getLogger().info(
      { fn: 'sendToTerminal', terminalName, textLength: text.length },
      `Sent text to terminal: ${terminalName}`,
    );

    // Send text without auto-submit (addNewLine = false)
    this.boundTerminal.sendText(text, false);
    return true;
  }

  /**
   * Gets a user-friendly display name for a terminal
   */
  private getTerminalDisplayName(terminal: vscode.Terminal): string {
    return terminal.name || 'Unnamed Terminal';
  }

  /**
   * Disposes of resources
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
