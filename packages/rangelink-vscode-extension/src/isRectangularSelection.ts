import type * as vscode from 'vscode';

/**
 * Detect if the VSCode selections represent a rectangular (block) selection.
 * Rectangular selections typically have multiple selections with the same character range across consecutive lines.
 *
 * This heuristic was moved from core to extension because:
 * - VSCode doesn't expose rectangular selection mode in its API
 * - Extension needs to infer from selection patterns
 * - Core should trust extension's determination, not infer again
 *
 * @param selections Array of VSCode selections to analyze
 * @returns true if this is a rectangular selection, false otherwise
 */
export function isRectangularSelection(selections: readonly vscode.Selection[]): boolean {
  // Need at least 2 selections to be a rectangular selection
  if (selections.length < 2) {
    return false;
  }

  // Get the character range from the first selection
  const firstStartChar = selections[0].start.character;
  const firstEndChar = selections[0].end.character;

  // Check if all selections have the same character range
  const allHaveSameCharacterRange = selections.every(
    (sel) => sel.start.character === firstStartChar && sel.end.character === firstEndChar,
  );

  if (!allHaveSameCharacterRange) {
    return false;
  }

  // Check if selections are on consecutive lines
  const lines = selections.map((sel) => sel.start.line).sort((a, b) => a - b);
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] !== lines[i - 1] + 1) {
      return false;
    }
  }

  return true;
}
