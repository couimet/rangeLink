import { Result, Ok, Err } from '../types/Result';
import { LinkPosition } from '../types/LinkPosition';
import { ParsedLink } from '../types/ParsedLink';
import { LinkType } from '../types/LinkType';
import { SelectionType } from '../types/SelectionType';

/**
 * Parse a RangeLink string into structured components.
 *
 * Supported formats:
 * - `#L10` (single line)
 * - `#L10-L20` (multi-line)
 * - `#L10C5-L20C10` (with columns)
 * - `##L10C5-L20C10` (rectangular)
 *
 * @param link - The RangeLink string to parse (e.g., "src/auth.ts#L42C10-L58C25")
 * @returns Result with ParsedLink on success, error message on failure
 *
 * @example
 * ```typescript
 * const result = parseLink("src/auth.ts#L42C10-L58C25");
 * if (result.success) {
 *   console.log(result.value.path); // "src/auth.ts"
 *   console.log(result.value.start); // { line: 42, char: 10 }
 * }
 * ```
 */
export const parseLink = (link: string): Result<ParsedLink, string> => {
  if (!link || link.trim() === '') {
    return Err('Link cannot be empty');
  }

  // Find the hash separator (# or ##)
  const hashIndex = link.indexOf('#');
  if (hashIndex === -1) {
    return Err('Link must contain # separator');
  }

  // Extract path and anchor
  const path = link.substring(0, hashIndex);
  const anchor = link.substring(hashIndex);

  if (path.trim() === '') {
    return Err('Path cannot be empty');
  }

  // Determine selection type (# = Normal, ## = Rectangular)
  const selectionType: SelectionType = anchor.startsWith('##')
    ? SelectionType.Rectangular
    : SelectionType.Normal;

  // Link type is always 'regular' for now (BYOD support comes in Iteration 1.3)
  const linkType: LinkType = LinkType.Regular;

  // Remove hash(es) from anchor
  const anchorContent =
    selectionType === SelectionType.Rectangular ? anchor.substring(2) : anchor.substring(1);

  // Parse the range specification
  // Formats: L10, L10-L20, L10C5-L20C10
  const rangeMatch = anchorContent.match(/^L(\d+)(?:C(\d+))?(?:-L(\d+)(?:C(\d+))?)?$/);

  if (!rangeMatch) {
    return Err(`Invalid range format: ${anchorContent}`);
  }

  const [, startLineStr, startCharStr, endLineStr, endCharStr] = rangeMatch;

  const startLine = parseInt(startLineStr, 10);
  const startChar = startCharStr ? parseInt(startCharStr, 10) : undefined;

  // If no end line specified, end equals start (both line and char)
  // If end line is specified, only copy char if explicitly provided
  const endLine = endLineStr ? parseInt(endLineStr, 10) : startLine;
  const endChar = endCharStr
    ? parseInt(endCharStr, 10)
    : endLineStr
      ? undefined // Different line but no end char specified
      : startChar; // Same line, copy start char

  // Validation
  if (startLine < 1) {
    return Err('Start line must be >= 1');
  }

  if (endLine < startLine) {
    return Err('End line cannot be before start line');
  }

  if (startChar !== undefined && startChar < 1) {
    return Err('Start character must be >= 1');
  }

  if (endChar !== undefined && endChar < 1) {
    return Err('End character must be >= 1');
  }

  // If on same line, end char must be >= start char
  if (startLine === endLine && startChar !== undefined && endChar !== undefined) {
    if (endChar < startChar) {
      return Err('End character cannot be before start character on same line');
    }
  }

  // Build start position (only include char if defined)
  const start: LinkPosition = {
    line: startLine,
    ...(startChar !== undefined && { char: startChar }),
  };

  // Build end position (only include char if defined)
  const end: LinkPosition = {
    line: endLine,
    ...(endChar !== undefined && { char: endChar }),
  };

  return Ok({
    path,
    start,
    end,
    linkType,
    selectionType,
  });
};
