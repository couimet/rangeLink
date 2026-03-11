import type * as vscode from 'vscode';

/**
 * Custom terminal link for file path detection.
 *
 * Extends VS Code's TerminalLink interface to store the matched file path text.
 *
 * **Properties:**
 * - `data`: The file path text detected in the terminal (e.g., "/src/auth.ts" or "./auth.ts")
 */
export interface FilePathTerminalLink extends vscode.TerminalLink {
  /**
   * The file path text detected in the terminal.
   *
   * This is the raw matched string (e.g., "/path/to/file.ts" or "./file.ts").
   * Passed to the navigation handler on click.
   */
  data: string;
}
