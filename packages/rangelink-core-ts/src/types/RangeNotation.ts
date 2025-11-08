/**
 * Controls how range information is notated in the generated link.
 *
 * This determines the output format based on SelectionCoverage information:
 *
 * ## Auto (Default Behavior)
 *
 * Intelligently chooses the most compact format:
 * - **All selections have FullLine coverage** → LineOnly format (e.g., `L10-L20`)
 *   - Compact, no character positions needed
 * - **Any selection has PartialLine coverage** → WithPositions format (e.g., `L10C5-L20C15`)
 *   - Preserves precise column boundaries
 *
 * This smart default respects the semantic meaning of SelectionCoverage.
 *
 * ## Enforce Options
 *
 * Override the Auto behavior for specific use cases:
 * - **EnforceFullLine**: Always output LineOnly format, discarding position information
 * - **EnforcePositions**: Always output WithPositions format, including positions even for FullLine
 */
export enum RangeNotation {
  /**
   * Smart default: Choose format based on SelectionCoverage.
   * See enum documentation above for details.
   */
  Auto = 'Auto',

  /**
   * Always use LineOnly format (e.g., `L10-L20`).
   * Discards position information.
   */
  EnforceFullLine = 'EnforceFullLine',

  /**
   * Always use WithPositions format (e.g., `L10C5-L20C15`).
   * Includes positions even for FullLine coverage.
   */
  EnforcePositions = 'EnforcePositions',
}
