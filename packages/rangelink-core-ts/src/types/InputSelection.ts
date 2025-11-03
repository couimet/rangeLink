import { Selection } from './Selection';
import { SelectionType } from './SelectionType';

/**
 * Encapsulates selections with explicit type information from the extension.
 *
 * This interface provides ground truth about the user's selection intent,
 * eliminating the need for the core library to infer selection type from patterns.
 *
 * ## Extension Responsibilities
 *
 * The extension must:
 * 1. Determine `selectionType` based on user's input method
 *    - Normal: Standard selection (Shift+Arrow, mouse drag, triple-click, etc.)
 *    - Rectangular: Column/block mode (Alt+Shift in VSCode, Ctrl+V in Vim)
 * 2. Provide all selections with appropriate `coverage` field
 *    - FullLine: Selection semantically covers entire line (based on line length)
 *    - PartialLine: Selection covers specific character positions
 *
 * ## Core Library Behavior
 *
 * The core library trusts the extension's determination and uses `selectionType`
 * directly instead of applying heuristics.
 *
 * @example
 * ```typescript
 * // Normal multi-line selection
 * const input: InputSelection = {
 *   selections: [
 *     { startLine: 10, startCharacter: 0, endLine: 15, endCharacter: 0, coverage: SelectionCoverage.FullLine }
 *   ],
 *   selectionType: SelectionType.Normal
 * };
 *
 * // Rectangular column selection
 * const input: InputSelection = {
 *   selections: [
 *     { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15, coverage: SelectionCoverage.PartialLine },
 *     { startLine: 11, startCharacter: 5, endLine: 11, endCharacter: 15, coverage: SelectionCoverage.PartialLine },
 *     { startLine: 12, startCharacter: 5, endLine: 12, endCharacter: 15, coverage: SelectionCoverage.PartialLine }
 *   ],
 *   selectionType: SelectionType.Rectangular
 * };
 * ```
 */
export interface InputSelection {
  /**
   * The selections to format into a link.
   * Typically one selection, or multiple for rectangular/column mode.
   */
  readonly selections: ReadonlyArray<Selection>;

  /**
   * The type of selection made by the user.
   * Determined by the extension based on user's input method.
   */
  readonly selectionType: SelectionType;
}
