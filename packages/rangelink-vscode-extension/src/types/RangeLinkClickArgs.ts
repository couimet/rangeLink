import type { ParsedLink, ParsedTextLink } from 'rangelink-core-ts';

/**
 * Common arguments for link click handlers across different provider types.
 *
 * Used by both terminal and document link providers to pass navigation
 * information to their respective click handlers.
 *
 * **Properties:**
 * - `linkText`: The full link text that was detected (e.g., "src/auth.ts#L42")
 * - `parsed`: Structured link data. Either a numeric RangeLink (path, positions,
 *   selection type) or a text highlight link (path + text directive).
 *
 * **Note:** This is the base interface with optional `parsed`. Use with `WithRequired`
 * for contexts where `parsed` is guaranteed to be defined.
 *
 * **Usage:**
 * ```typescript
 * // When parsed is always defined (after successful parsing)
 * import type { WithRequired } from './WithRequired';
 * type RequiredClickArgs = WithRequired<RangeLinkClickArgs, 'parsed'>;
 *
 * const args: RequiredClickArgs = {
 *   linkText: 'src/auth.ts#L42',
 *   parsed: { path: 'src/auth.ts', start: { line: 42 }, ... }
 * };
 * await provider.handleLinkClick(args);
 * ```
 */
export interface RangeLinkClickArgs {
  /**
   * The full link text that was detected.
   *
   * This is the raw matched string (e.g., "src/auth.ts#L42").
   * Useful for logging and debugging.
   */
  linkText: string;

  /**
   * Parsed link data. Narrow via `'directive' in parsed` to distinguish a text
   * highlight link (`ParsedTextLink`) from a numeric RangeLink (`ParsedLink`).
   *
   * For a numeric RangeLink:
   * - `path`: File path
   * - `start`: Start position (line, char)
   * - `end`: End position (line, char)
   * - `linkType`: Regular or Rectangular
   * - `selectionType`: Normal or Rectangular
   *
   * Required (non-optional) in this interface. Used by document link provider
   * where parsed data is always available after successful link creation.
   */
  parsed: ParsedLink | ParsedTextLink;
}
