import { DEFAULT_DELIMITERS } from '../constants/DEFAULT_DELIMITERS';
import { MAX_LINK_LENGTH } from '../constants/MAX_LINK_LENGTH';
import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { getLogger } from '../logging/LogManager';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { LinkPosition } from '../types/LinkPosition';
import { LinkType } from '../types/LinkType';
import { ParsedLink } from '../types/ParsedLink';
import { Result, Ok, Err } from '../types/Result';
import { SelectionType } from '../types/SelectionType';
import { escapeRegex } from '../utils/escapeRegex';

/**
 * Parse a RangeLink string into structured components.
 *
 * Supported formats:
 * - `#L10` (single line)
 * - `#L10-L20` (multi-line)
 * - `#L10C5-L20C10` (with columns)
 * - `##L10C5-L20C10` (rectangular)
 *
 * With custom delimiters:
 * - `@line10pos5:line20pos10` (hash='@', line='line', position='pos', range=':')
 *
 * **Hash-in-Filename Support:**
 * The parser correctly handles filenames containing the hash delimiter:
 * - `file#1.ts#L10` → path=`file#1.ts`, line=10 ✅
 * - `issue#123/auth.ts#L42` → path=`issue#123/auth.ts`, line=42 ✅
 *
 * Uses a unified regex pattern that matches from right-to-left (non-greedy path capture),
 * ensuring the hash delimiter is found in the anchor portion, not the filename.
 *
 * @param link - The RangeLink string to parse (e.g., "src/auth.ts#L42C10-L58C25")
 * @param delimiters - Optional delimiter configuration. If not provided, falls back to DEFAULT_DELIMITERS
 * @returns Result with ParsedLink on success, RangeLinkError on failure
 *
 * @example
 * ```typescript
 * // Using default delimiters (not provided)
 * const result = parseLink("src/auth.ts#L42C10-L58C25");
 * if (result.success) {
 *   console.log(result.value.path); // "src/auth.ts"
 *   console.log(result.value.start); // { line: 42, char: 10 }
 * }
 *
 * // Providing custom delimiters explicitly
 * const customDelimiters = { hash: '@', line: 'line', position: 'pos', range: ':' };
 * const result2 = parseLink("file.ts@line10pos5:line20pos10", customDelimiters);
 *
 * // Hash in filename (correctly handled)
 * const result3 = parseLink("file#1.ts#L10");
 * // → path: "file#1.ts", start: { line: 10 }
 * ```
 */
export const parseLink = (
  link: string,
  delimiters?: DelimiterConfig,
): Result<ParsedLink, RangeLinkError> => {
  // Check link length for safety
  if (link.length > MAX_LINK_LENGTH) {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_LINK_TOO_LONG,
        message: `Link exceeds maximum length of ${MAX_LINK_LENGTH} characters`,
        functionName: 'parseLink',
        details: { received: link.length, maximum: MAX_LINK_LENGTH },
      }),
    );
  }

  if (!link || link.trim() === '') {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_EMPTY_LINK,
        message: 'Link cannot be empty',
        functionName: 'parseLink',
      }),
    );
  }

  // Determine which delimiters to use and log accordingly
  const useFallback = delimiters === undefined;
  const activeDelimiters = useFallback ? DEFAULT_DELIMITERS : delimiters;

  const logger = getLogger();
  const logCtx = { fn: 'parseLink', link };

  if (useFallback) {
    logger.debug(
      { ...logCtx, delimiters: activeDelimiters },
      'No delimiter config provided, using DEFAULT_DELIMITERS',
    );
  } else {
    logger.debug({ ...logCtx, delimiters: activeDelimiters }, 'Using provided delimiter config');
  }

  // Escape delimiters for regex matching
  const escapedHash = escapeRegex(activeDelimiters.hash);
  const escapedLine = escapeRegex(activeDelimiters.line);
  const escapedPosition = escapeRegex(activeDelimiters.position);
  const escapedRange = escapeRegex(activeDelimiters.range);

  // Build unified regex pattern that matches entire link from start to end
  // Pattern: ^(path)(hash{1,2})(line)(digits)(optional: position digits)(optional: range section)$
  //
  // For single-character hashes: Use non-greedy (.+?) to allow hash in filenames
  //   - "file#1.ts#L10" with hash="#" → path="file#1.ts", hash="#", line=10 ✅
  //
  // For multi-character hashes: Use negative lookahead to prevent ambiguity
  //   - "file.ts>>>>line10" with hash=">>" → path="file.ts", hash=">>>>", line=10 ✅
  //   - Without lookahead, would incorrectly match: path="file.ts>", hash=">>" ❌
  //
  // Trade-off: Multi-char hashes cannot appear in filenames to avoid ambiguity.
  // This is acceptable since multi-char delimiters are rare in practice.
  const pathPattern =
    activeDelimiters.hash.length === 1
      ? '(.+?)' // Single-char: allow in path, non-greedy matching
      : `((?:(?!${escapedHash}).)+)`; // Multi-char: prevent in path with negative lookahead

  const fullLinkPattern = new RegExp(
    `^${pathPattern}((?:${escapedHash}){1,2})${escapedLine}(\\d+)(?:${escapedPosition}(\\d+))?(?:${escapedRange}${escapedLine}(\\d+)(?:${escapedPosition}(\\d+))?)?$`,
  );

  const match = link.match(fullLinkPattern);

  if (!match) {
    // Check for empty path (link starts with hash)
    if (link.startsWith(activeDelimiters.hash)) {
      return Err(
        new RangeLinkError({
          code: RangeLinkErrorCodes.PARSE_EMPTY_PATH,
          message: 'Path cannot be empty',
          functionName: 'parseLink',
        }),
      );
    }

    // Check if hash separator is missing entirely
    if (!link.includes(activeDelimiters.hash)) {
      return Err(
        new RangeLinkError({
          code: RangeLinkErrorCodes.PARSE_NO_HASH_SEPARATOR,
          message: `Link must contain ${activeDelimiters.hash} separator`,
          functionName: 'parseLink',
          details: { hash: activeDelimiters.hash },
        }),
      );
    }

    // Hash exists but format is invalid
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Invalid range format',
        functionName: 'parseLink',
        details: { link, delimiters: activeDelimiters },
      }),
    );
  }

  // Extract captured groups
  const [, path, capturedHash, startLineStr, startCharStr, endLineStr, endCharStr] = match;

  // Validate that path is not just the hash delimiter or empty
  // Edge case: ##L10 could match with path="#" if regex captures first # as path
  if (path === activeDelimiters.hash || path.trim() === '') {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_EMPTY_PATH,
        message: 'Path cannot be empty',
        functionName: 'parseLink',
      }),
    );
  }

  // Detect selection type based on hash length
  // Single hash (e.g., "#") → Normal mode
  // Double hash (e.g., "##") → Rectangular mode
  const isRectangular = capturedHash.length === activeDelimiters.hash.length * 2;
  const selectionType: SelectionType = isRectangular
    ? SelectionType.Rectangular
    : SelectionType.Normal;

  // Link type is always 'Regular' for now (BYOD parsing deferred to Phase 1C)
  const linkType: LinkType = LinkType.Regular;

  // Parse line and character positions
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
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_LINE_BELOW_MINIMUM,
        message: 'Start line must be >= 1',
        functionName: 'parseLink',
        details: { received: startLine, minimum: 1, position: 'start' },
      }),
    );
  }

  if (endLine < startLine) {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_LINE_BACKWARD,
        message: 'End line cannot be before start line',
        functionName: 'parseLink',
        details: { startLine, endLine },
      }),
    );
  }

  if (startChar !== undefined && startChar < 1) {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_CHAR_BELOW_MINIMUM,
        message: 'Start character must be >= 1',
        functionName: 'parseLink',
        details: { received: startChar, minimum: 1, position: 'start' },
      }),
    );
  }

  if (endChar !== undefined && endChar < 1) {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_CHAR_BELOW_MINIMUM,
        message: 'End character must be >= 1',
        functionName: 'parseLink',
        details: { received: endChar, minimum: 1, position: 'end' },
      }),
    );
  }

  // If on same line, end char must be >= start char
  if (startLine === endLine && startChar !== undefined && endChar !== undefined) {
    if (endChar < startChar) {
      return Err(
        new RangeLinkError({
          code: RangeLinkErrorCodes.PARSE_CHAR_BACKWARD_SAME_LINE,
          message: 'End character cannot be before start character on same line',
          functionName: 'parseLink',
          details: { startChar, endChar, line: startLine },
        }),
      );
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
