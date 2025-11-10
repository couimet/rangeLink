import * as vscode from 'vscode';

/**
 * Adapter interface for IDE-specific operations.
 *
 * Abstracts VSCode API calls to enable testing and potential future
 * support for other IDEs (Cursor, Neovim, etc.).
 *
 * This interface focuses on UI operations needed by RangeLinkService:
 * - Clipboard operations
 * - Status bar messages
 * - User notifications
 */
export interface IdeAdapter {
  /**
   * Write text to the system clipboard
   * @param text - The text to copy to clipboard
   * @returns Promise that resolves when copy completes
   */
  writeTextToClipboard(text: string): Promise<void>;

  /**
   * Show a temporary message in the IDE's status bar
   * @param message - The message to display
   * @param timeout - Duration in milliseconds (optional)
   * @returns Disposable to clear the message early
   */
  setStatusBarMessage(message: string, timeout?: number): vscode.Disposable;

  /**
   * Show a warning message notification to the user
   * @param message - The warning message to display
   * @returns Promise that resolves to the selected button (if any)
   */
  showWarningMessage(message: string): Promise<string | undefined>;

  /**
   * Show an error message notification to the user
   * @param message - The error message to display
   * @returns Promise that resolves to the selected button (if any)
   */
  showErrorMessage(message: string): Promise<string | undefined>;
}
