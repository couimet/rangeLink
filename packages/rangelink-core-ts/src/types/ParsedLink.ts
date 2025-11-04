import { LinkType } from './LinkType';
import { LinkPosition } from './LinkPosition';
import { SelectionType } from './SelectionType';

/**
 * Parsed RangeLink with structured data.
 *
 * Represents the output of parsing a RangeLink string into its components.
 * Contains the file path, position range, link type, and selection type.
 */
export interface ParsedLink {
  /**
   * File path extracted from the link.
   * May be relative (e.g., "src/file.ts") or absolute (e.g., "/Users/name/project/file.ts").
   */
  path: string;

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
   * - 'regular': Standard RangeLink (e.g., "file.ts#L10-L20")
   * - 'portable': BYOD link with embedded delimiter metadata
   */
  linkType: LinkType;

  /**
   * The selection type (Normal or Rectangular).
   * - 'Normal': Standard single or multi-line selection
   * - 'Rectangular': Rectangular/block selection (indicated by double hash ##)
   */
  selectionType: SelectionType;
}
