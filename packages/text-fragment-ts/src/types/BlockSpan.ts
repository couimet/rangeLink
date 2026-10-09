/**
 * One block of a document, as a half-open range of RAW document offsets.
 *
 * A block is the region a browser treats as one run of text: a paragraph, a
 * list item, a table cell, a heading. The specification confines each directive
 * term to a single block, so a term that would straddle two blocks does not
 * match, while a range match may still start in one block and end in another.
 *
 * The spans are the caller's, because only the caller knows how the text it
 * passes in was laid out. Offsets are raw, measured before any end-of-line or
 * whitespace normalization.
 */
export interface BlockSpan {
  /** Raw offset of the block's first code unit. */
  start: number;
  /** Raw offset one past the block's last code unit. */
  end: number;
}
