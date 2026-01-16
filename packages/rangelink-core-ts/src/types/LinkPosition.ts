/**
 * Position within a file from link format context (1-indexed).
 *
 * Represents a position in the external link format (e.g., `#L10C5`).
 * Used by ParsedLink to represent start/end positions after parsing.
 *
 * Line numbers and character positions are 1-indexed (link format).
 * Character is optional - omitted for full-line references (e.g., `#L10`).
 *
 * When navigating to code, this is converted to EditorPosition (0-indexed)
 * by querying document line length for full-line cases.
 */
export interface LinkPosition {
  /**
   * Line number (1-indexed, matching link format)
   */
  readonly line: number;

  /**
   * Character position within the line (1-indexed, OPTIONAL)
   * Undefined represents a full-line reference.
   */
  readonly character?: number;
}
