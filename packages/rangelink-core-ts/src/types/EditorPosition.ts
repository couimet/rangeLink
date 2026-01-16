/**
 * Position within a file from editor context (0-indexed).
 *
 * Represents a position from an editor selection where both line and character
 * are always provided. This is the internal representation used by the Selection
 * interface.
 *
 * Line numbers and character positions are 0-indexed (editor-native format).
 * When formatting links, these are converted to 1-indexed LinkPosition.
 */
export interface EditorPosition {
  /**
   * Line number (0-indexed)
   */
  readonly line: number;

  /**
   * Character position within the line (0-indexed, REQUIRED)
   * Editor selections always provide character position.
   */
  readonly character: number;
}
