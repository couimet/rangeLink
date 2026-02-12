import { ComputedSelection } from './ComputedSelection';
import { DelimiterConfig } from './DelimiterConfig';
import { LinkType } from './LinkType';
import { RangeFormat } from './RangeFormat';
import { SelectionType } from './SelectionType';

/**
 * A formatted RangeLink with its metadata.
 * Includes not only the generated link but also all resolved options and configuration.
 * This makes the function's decisions transparent and supports debugging/logging.
 */
export interface FormattedLink {
  /**
   * The generated RangeLink string, quoted when the path contains unsafe characters.
   *
   * Safe path: `src/file.ts#L10` (no quotes)
   * Unsafe path: `'My Folder/file.ts#L10'` (single-quoted)
   *
   * Safe to use in any context: clipboard, terminal paste, editor paste, chat.
   */
  readonly link: string;

  /**
   * The raw unquoted RangeLink string, always without surrounding quotes.
   *
   * When the path is safe: `rawLink === link`
   * When the path is unsafe: `rawLink` has no quotes while `link` is quoted.
   *
   * Use for display, logging, bookmarks, or internal comparison.
   */
  readonly rawLink: string;

  /**
   * The link type that was generated.
   */
  readonly linkType: LinkType;

  /**
   * The delimiter configuration used to generate the link.
   */
  readonly delimiters: DelimiterConfig;

  /**
   * The computed selection that was formatted into the link.
   * Includes the actual line/position coordinates and format decisions.
   */
  readonly computedSelection: ComputedSelection;

  /**
   * The range format that was applied (LineOnly or WithPositions).
   * This matches computedSelection.rangeFormat.
   */
  readonly rangeFormat: RangeFormat;

  /**
   * The selection type (Normal or Rectangular).
   * This matches computedSelection.selectionType.
   */
  readonly selectionType: SelectionType;
}
