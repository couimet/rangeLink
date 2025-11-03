/**
 * Indicates whether a selection covers the full line or only partial positions.
 * This is determined by the extension based on editor context.
 */
export enum SelectionCoverage {
  /**
   * Selection covers the entire line from beginning to end.
   */
  FullLine = 'FullLine',

  /**
   * Selection covers only partial positions within the line.
   */
  PartialLine = 'PartialLine',
}
