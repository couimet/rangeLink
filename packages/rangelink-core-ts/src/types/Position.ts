/**
 * Position within a file (line and optional character).
 *
 * Used by the parser to represent start/end positions in a RangeLink.
 * Line numbers are 1-indexed (matching link format).
 * Character positions are optional and 1-indexed when present.
 */
export interface Position {
  /**
   * Line number (1-indexed)
   */
  line: number;

  /**
   * Character position within the line (1-indexed, optional)
   * When undefined, represents a line-only reference
   */
  char?: number;
}
