import { TextDirective } from './TextDirective';

/**
 * A parsed text fragment link: `<path>:~:text=…`.
 *
 * Text fragments identify an exact block of text by content rather than by
 * coordinates, so they stay valid when edits move the text. This type is
 * parallel to rangelink-core-ts's `ParsedLink` (numeric anchors); consumers
 * distinguish the two with the `'directive' in parsed` narrowing.
 *
 * `path` is raw (unquoted). Path quoting is the consumer's policy, not this
 * package's: parse strips inbound quotes because reading a quoted link is part
 * of parsing, but it never re-quotes, and format never emits quotes.
 */
export interface ParsedTextFragment {
  /**
   * File path extracted from the link (always raw/unquoted).
   * May be relative (e.g., "src/file.ts") or absolute (e.g., "/Users/name/project/file.ts").
   */
  path: string;

  /**
   * Parsed text-fragment directive (the percent-decoded terms).
   */
  directive: TextDirective;
}
