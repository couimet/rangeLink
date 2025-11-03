/**
 * Specifies how much detail to include in the range specification part of a link.
 * - LineOnly: Only line numbers (e.g., L10-L20)
 * - WithPositions: Line numbers + character positions (e.g., L10C5-L20C10)
 */
export enum RangeFormat {
  LineOnly = 'LineOnly',
  WithPositions = 'WithPositions',
}
