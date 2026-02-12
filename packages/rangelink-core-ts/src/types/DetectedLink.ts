import { ParsedLink } from './ParsedLink';

/**
 * A link detected in text by findLinksInText().
 *
 * Represents both unquoted links (matched by the standard pattern) and
 * quoted links (wrapped in single or double quotes to support paths with spaces).
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
  /** Parsed link data */
  readonly parsed: ParsedLink;
}
