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
   * Create a new VSCode adapter.
   *
   * @param ideInstance - The vscode module instance to use for all operations
   */
  constructor(private readonly ideInstance: typeof vscode) {}

  /**
   * Write text to clipboard using VSCode API
   */
  async writeTextToClipboard(text: string): Promise<void> {
    return this.ideInstance.env.clipboard.writeText(text);
  }

  /**
   * Show temporary status bar message using VSCode API
   */
  setStatusBarMessage(message: string, timeout?: number): vscode.Disposable {
    if (timeout !== undefined) {
      return this.ideInstance.window.setStatusBarMessage(message, timeout);
    }
    return this.ideInstance.window.setStatusBarMessage(message);
  }

  /**
   * Show warning notification using VSCode API
   */
  async showWarningMessage(message: string): Promise<string | undefined> {
    return this.ideInstance.window.showWarningMessage(message);
  }

  /**
   * Show error notification using VSCode API
   */
  async showErrorMessage(message: string): Promise<string | undefined> {
    return this.ideInstance.window.showErrorMessage(message);
  }

  /**
   * Show information notification using VSCode API
   */
  async showInformationMessage(message: string): Promise<string | undefined> {
    return this.ideInstance.window.showInformationMessage(message);
  }

  /**
   * Open a document and show it in the editor
   *
   * @param uri - URI of the document to open
   * @returns Promise resolving to the text editor showing the document
   */
  async showTextDocument(uri: vscode.Uri): Promise<vscode.TextEditor> {
    const document = await this.ideInstance.workspace.openTextDocument(uri);
    return this.ideInstance.window.showTextDocument(document);
  }
}
