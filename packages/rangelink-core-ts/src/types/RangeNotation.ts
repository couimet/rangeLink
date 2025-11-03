/**
 * Controls how range information is notated in the generated link.
 */
export enum RangeNotation {
  /**
   * Automatically choose the most compact notation.
   * Uses line-only format if all selections are FullLine, otherwise includes positions.
   */
  Auto = 'Auto',

  /**
   * Force line-only notation (e.g., L10-L20) even if selections have positions.
   */
  EnforceFullLine = 'EnforceFullLine',

  /**
   * Force position notation (e.g., L10C5-L20C15) even if all selections are FullLine.
   */
  EnforcePositions = 'EnforcePositions',
}
