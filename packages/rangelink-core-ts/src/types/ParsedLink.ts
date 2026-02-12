import { LinkPosition } from './LinkPosition';
import { LinkType } from './LinkType';
import { SelectionType } from './SelectionType';

/**
 * Parsed RangeLink with structured data.
 *
 * Represents the output of parsing a RangeLink string into its components.
 * Contains the file path, position range, link type, and selection type.
 */
export interface ParsedLink {
  /**
   * File path extracted from the link (always raw/unquoted).
   * May be relative (e.g., "src/file.ts") or absolute (e.g., "/Users/name/project/file.ts").
   *
   * Use for filesystem operations — this is the semantic path.
   */
  path: string;

  /**
   * The path wrapped in single quotes when it contains unsafe characters.
   *
   * When safe: `quotedPath === path` (e.g., `"src/file.ts"`)
   * When unsafe: path is quoted (e.g., `"'My Folder/file.ts'"`)
   *
   * Provides API symmetry with FormattedLink's `link`/`rawLink` duality.
   */
  quotedPath: string;

  /**
   * Start position within the file.
   */
  start: LinkPosition;

  /**
   * End position within the file.
   * For single-line references, end equals start.
   */
  end: LinkPosition;

  /**
   * The link type (Regular or Portable/BYOD).
   * - 'Regular': Standard RangeLink (e.g., "file.ts#L10-L20")
   * - 'Portable': BYOD link with embedded delimiter metadata (not yet supported in parsing)
   */
  linkType: LinkType;

  /**
   * The selection type (Normal or Rectangular).
   * - 'Normal': Standard single or multi-line selection
   * - 'Rectangular': Rectangular/block selection (indicated by double hash ##)
   */
  selectionType: SelectionType;
}
