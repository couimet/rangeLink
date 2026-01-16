import type { LinkPosition } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

/**
 * Converted position result with 0-indexed line and character.
 */
export interface ConvertedPosition {
  /** 0-indexed line number (clamped to document bounds) */
  line: number;
  /** 0-indexed character position (clamped to line length) */
  character: number;
}

/**
 * Convert RangeLink positions to VSCode positions with clamping.
 *
 * Handles coordinate conversion from 1-indexed (user-facing RangeLink format)
 * to 0-indexed (VSCode API). Clamps positions to document and line bounds to
 * prevent out-of-range errors.
 *
 * **Coordinate Systems:**
 * - RangeLink: 1-indexed lines and columns (e.g., `#L10C5` = line 10, column 5)
 * - VSCode: 0-indexed lines and characters (e.g., `Position(9, 4)`)
 *
 * **Clamping Behavior:**
 * - Lines clamped to `[0, document.lineCount - 1]`
 * - Characters clamped to `[0, lineLength]`
 * - Undefined character defaults to 0 (start of line)
 *
 * @param position - RangeLink position (1-indexed, char may be undefined)
 * @param document - VSCode document for bounds checking
 * @returns Converted position (0-indexed, clamped to document bounds)
 */
export const convertRangeLinkPosition = (
  position: LinkPosition,
  document: vscode.TextDocument,
): ConvertedPosition => {
  // Convert 1-indexed to 0-indexed and clamp to document bounds
  const line = Math.max(0, Math.min(position.line - 1, document.lineCount - 1));

  // Get actual line length for character clamping
  const lineLength = document.lineAt(line).text.length;

  // Convert character (default to 0 if undefined) and clamp to line length
  const character =
    position.character !== undefined ? Math.max(0, Math.min(position.character - 1, lineLength)) : 0;

  return { line, character };
};
