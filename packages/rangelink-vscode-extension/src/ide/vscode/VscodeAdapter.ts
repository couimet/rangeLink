import * as vscode from 'vscode';

import { resolveWorkspacePath } from '../../utils/resolveWorkspacePath';

/**
 * VSCode adapter for IDE-specific operations.
 *
 * Complete facade around VSCode API providing single entry point for:
 * - Clipboard operations
 * - Status bar messages
 * - User notifications (warning, error, info)
 * - Document/editor operations
 * - Workspace operations (path resolution)
 * - Primitive factories (Position, Selection, Range)
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

  // ============================================================================
  // Workspace Operations
  // ============================================================================

  /**
   * Resolve a file path from a RangeLink to an absolute file URI.
   *
   * Delegates to resolveWorkspacePath utility for path resolution logic.
   *
   * @param linkPath - File path from RangeLink (may be relative or absolute)
   * @returns File URI if found, undefined otherwise
   */
  async resolveWorkspacePath(linkPath: string): Promise<vscode.Uri | undefined> {
    return resolveWorkspacePath(linkPath, this.ideInstance);
  }

  // ============================================================================
  // Primitive Factories
  // ============================================================================

  /**
   * Create a Position instance representing a line and character location.
   *
   * @param line - Zero-based line number
   * @param character - Zero-based character offset
   * @returns Position instance
   */
  createPosition(line: number, character: number): vscode.Position {
    return new this.ideInstance.Position(line, character);
  }

  /**
   * Create a Selection instance representing a text selection range.
   *
   * @param anchor - Starting position of the selection
   * @param active - Ending position of the selection
   * @returns Selection instance
   */
  createSelection(anchor: vscode.Position, active: vscode.Position): vscode.Selection {
    return new this.ideInstance.Selection(anchor, active);
  }

  /**
   * Create a Range instance representing a range between two positions.
   *
   * @param start - Starting position of the range
   * @param end - Ending position of the range
   * @returns Range instance
   */
  createRange(start: vscode.Position, end: vscode.Position): vscode.Range {
    return new this.ideInstance.Range(start, end);
  }
}
