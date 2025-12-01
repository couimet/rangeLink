/**
 * Type of content being pasted to a destination.
 *
 * Used to unify pasteLink() and pasteContent() into a single paste operation,
 * eliminating 360+ lines of duplication across chat assistant destinations.
 */
export enum PasteContentType {
  /**
   * Formatted RangeLink (e.g., "src/file.ts#L10-L20")
   */
  Link = 'Link',

  /**
   * Raw text content (e.g., selected code or text)
   */
  Text = 'Text',
}
