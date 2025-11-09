import * as vscode from 'vscode';

import type { IdeAdapter } from '../IdeAdapter';

/**
 * VSCode implementation of IdeAdapter interface.
 *
 * Delegates to VSCode API for clipboard, status bar, and notification operations.
 * This adapter is a thin wrapper with no business logic - it simply forwards calls
 * to the appropriate VSCode APIs.
 */
export class VscodeAdapter implements IdeAdapter {
  /**
   * Write text to clipboard using VSCode API
   */
  async writeTextToClipboard(text: string): Promise<void> {
    return vscode.env.clipboard.writeText(text);
  }

  /**
   * Show temporary status bar message using VSCode API
   */
  setStatusBarMessage(message: string, timeout?: number): vscode.Disposable {
    if (timeout !== undefined) {
      return vscode.window.setStatusBarMessage(message, timeout);
    }
    return vscode.window.setStatusBarMessage(message);
  }

  /**
   * Show warning notification using VSCode API
   */
  async showWarningMessage(message: string): Promise<string | undefined> {
    return vscode.window.showWarningMessage(message);
  }
}
