import * as vscode from 'vscode';

/**
 * VSCode adapter for IDE-specific operations.
 *
 * Thin wrapper around VSCode API for:
 * - Clipboard operations
 * - Status bar messages
 * - User notifications (warning, error, info)
 * - Document/editor operations
 *
 * Enables testing by abstracting VSCode API calls and avoiding direct
 * vscode module imports in business logic classes.
 */
export class VscodeAdapter {
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

  /**
   * Show error notification using VSCode API
   */
  async showErrorMessage(message: string): Promise<string | undefined> {
    return vscode.window.showErrorMessage(message);
  }
}
