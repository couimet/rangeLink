import { ParsedLinkBase } from './ParsedLinkBase';
import { TextDirective } from './TextDirective';

/**
 * A parsed text highlight link: `<path>:~:text=…`.
 *
 * Highlights identify an exact block of text by content rather than by
 * coordinates, so they stay valid when edits move the text. This type is
 * parallel to `ParsedLink` (numeric anchors); consumers distinguish the two
 * with the `'directive' in parsed` narrowing.
 */
export interface ParsedTextLink extends ParsedLinkBase {
  /**
   * Parsed text-fragment directive (the percent-decoded terms).
   */
  directive: TextDirective;
}
