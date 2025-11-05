import type { ParsedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

/**
 * Custom terminal link with typed data property and parsed link information.
 *
 * Extends VS Code's TerminalLink interface to store both the raw link text
 * and the structured parsed data (path, line, column positions).
 *
 * **Properties:**
 * - `data`: The full link text that was detected in the terminal (e.g., "src/auth.ts#L42")
 * - `parsed`: Structured link data (path, positions, selection type). Undefined if parsing failed.
 *
 * **Usage:**
 * ```typescript
 * const link: RangeLinkTerminalLink = {
 *   startIndex: 10,
 *   length: 17,
 *   tooltip: 'Open src/auth.ts:42',
 *   data: 'src/auth.ts#L42',
 *   parsed: { path: 'src/auth.ts', start: { line: 42 }, ... }
 * };
 * ```
 */
export interface RangeLinkTerminalLink extends vscode.TerminalLink {
  /**
   * The full link text that was detected in the terminal.
   *
   * This is the raw matched string (e.g., "src/auth.ts#L42").
   * Useful for logging and debugging.
   */
  data: string;

  /**
   * Parsed link data (path, line, column positions).
   *
   * Contains structured information about the link:
   * - `path`: File path
   * - `start`: Start position (line, char)
   * - `end`: End position (line, char)
   * - `linkType`: Regular or Rectangular
   * - `selectionType`: Normal or Rectangular
   *
   * Undefined if parsing failed. Parse failures are handled gracefully -
   * links remain clickable but show a warning message instead of navigating.
   */
  parsed?: ParsedLink;
}
