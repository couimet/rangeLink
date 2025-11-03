import { Selection } from '../types/Selection';

/**
 * Detect if the selections represent a rectangular (block) selection.
 * Rectangular selections typically have multiple selections with the same character range across consecutive lines.
 *
 * @param selections Array of selections to analyze
 * @returns true if this is a rectangular selection, false otherwise
 */
export function isRectangularSelection(selections: ReadonlyArray<Selection>): boolean {
  // Need at least 2 selections to be a rectangular selection
  if (selections.length < 2) {
    return false;
  }

  // Get the character range from the first selection
  const firstStartChar = selections[0].startCharacter;
  const firstEndChar = selections[0].endCharacter;

  // Check if all selections have the same character range
  const allHaveSameCharacterRange = selections.every(
    (sel) => sel.startCharacter === firstStartChar && sel.endCharacter === firstEndChar,
  );

  if (!allHaveSameCharacterRange) {
    return false;
  }

  // Check if selections are on consecutive lines
  const lines = selections.map((sel) => sel.startLine).sort((a, b) => a - b);
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] !== lines[i - 1] + 1) {
      return false;
    }
  }

  return true;
}
