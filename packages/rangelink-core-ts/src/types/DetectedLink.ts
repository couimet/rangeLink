import { ParsedLink } from './ParsedLink';
import { ParsedTextLink } from './ParsedTextLink';

/**
 * A link detected in text by findLinksInText().
 *
 * Represents unquoted links (matched by the standard pattern), quoted links
 * (wrapped in single or double quotes to support paths with spaces), and text
 * highlight links (matched by the highlight pass).
 *
 * This is a data-only type — presentation concerns like tooltips are added
 * by the consuming layer (e.g., VSCode extension).
 */
export interface DetectedLink {
  /** The link text for parsing/navigation (without surrounding quotes if the match was quoted) */
  readonly linkText: string;
  /** Start index in the source text (includes surrounding quotes if present) */
  readonly startIndex: number;
  /** Length in the source text (includes surrounding quotes if present) */
  readonly length: number;
  /** Parsed link data — numeric/range links parse to ParsedLink, highlights to ParsedTextLink (distinguish via `'directive' in parsed`) */
  readonly parsed: ParsedLink | ParsedTextLink;
}
