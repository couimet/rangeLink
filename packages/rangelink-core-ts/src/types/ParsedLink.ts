import { LinkType } from './LinkType';
import { Position } from './Position';
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
   * Line numbers and character positions are 1-indexed.
   */
  start: Position;

  /**
   * End position within the file.
   * Line numbers and character positions are 1-indexed.
   * For single-line references, end equals start.
   */
  end: Position;

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
