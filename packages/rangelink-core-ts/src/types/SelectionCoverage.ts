/**
 * Indicates whether a selection covers the full line or only partial positions.
 *
 * This semantic information is determined by the extension based on editor context
 * (line length) and affects the generated link format when using RangeNotation.Auto.
 *
 * See RangeNotation enum documentation for details on how coverage influences format.
 */
export enum SelectionCoverage {
  /**
   * Selection covers the entire line from beginning to end.
   * Extension determines this by checking if selection spans from column 0 to line length.
   */
  FullLine = 'FullLine',

  /**
   * Selection covers only partial positions within the line.
   * Any selection that doesn't span the entire line.
   */
  PartialLine = 'PartialLine',
}
