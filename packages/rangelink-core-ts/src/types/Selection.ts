import { SelectionCoverage } from './SelectionCoverage';

/**
 * Pure domain representation of a text selection.
 * Uses 0-based indexing for lines and characters.
 *
 * This is an Anti-Corruption Layer (ACL) that decouples the core domain
 * from IDE-specific types like vscode.Selection.
 *
 * ## Extension Responsibilities
 *
 * The extension must determine `coverage` based on editor context:
 * - **FullLine**: Selection covers entire line from beginning to end
 *   - Check if selection spans from start of line (column 0) to end of line (line length)
 *   - Example: User selected full line with triple-click or Shift+End from start
 * - **PartialLine**: Selection covers specific character positions within line
 *   - Any selection that doesn't cover the entire line
 *   - Example: User selected specific word or phrase
 *
 * @example
 * ```typescript
 * // Full line selection (line has 80 characters)
 * const fullLine: Selection = {
 *   startLine: 10,
 *   startCharacter: 0,
 *   endLine: 10,
 *   endCharacter: 80,
 *   coverage: SelectionCoverage.FullLine
 * };
 *
 * // Partial line selection
 * const partial: Selection = {
 *   startLine: 10,
 *   startCharacter: 5,
 *   endLine: 10,
 *   endCharacter: 20,
 *   coverage: SelectionCoverage.PartialLine
 * };
 * ```
 */
export interface Selection {
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;

  /**
   * Indicates whether this selection covers the full line or partial positions.
   * Determined by the extension based on editor context (line length, etc.).
   */
  readonly coverage: SelectionCoverage;
}
