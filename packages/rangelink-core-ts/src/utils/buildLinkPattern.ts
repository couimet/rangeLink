import { DelimiterConfig } from '../types/DelimiterConfig';

import { escapeRegex } from './escapeRegex';

/**
 * URL exclusion patterns for RangeLink detection.
 *
 * These prevent web URLs from being matched as RangeLinks:
 * - NOT_AFTER_URL_CHAR: Lookbehind to block matches mid-URL
 * - NO_WEB_URL_SCHEME: Lookahead to block matches at URL scheme start
 */
const NOT_AFTER_URL_CHAR = '(?<![a-zA-Z0-9:/._?&=%~-])';
const NO_WEB_URL_SCHEME = '(?![hH][tT][tT][pP][sS]?://|[fF][tT][pP]://)';

/**
 * Builds a RegExp pattern for detecting RangeLinks in terminal output.
 *
 * The pattern detects links in the format supported by parseLink(), using
 * the provided delimiter configuration. The regex has the global flag enabled
 * to find all matches in a terminal line.
 *
 * **Pattern Strategy**:
 * - For single-char hashes: Non-greedy path capture allows hash in filenames
 * - For multi-char hashes: Negative lookahead prevents ambiguity
 *
 * **Supported Formats**:
 * - `file.ts#L10` (single line)
 * - `file.ts#L10-L20` (multi-line)
 * - `file.ts#L10C5-L20C10` (with columns)
 * - `file.ts##L10C5-L20C10` (rectangular mode)
 * - `file#1.ts#L10` (hash in filename)
 *
 * **Capture Groups**:
 * - Group 0: Entire match (full link)
 * - Group 1: Path portion
 * - Group 2: Hash delimiter(s) - single or double
 * - Remaining groups: Range components (line/char numbers)
 *
 * @param delimiters - Delimiter configuration to use for pattern
 * @returns RegExp with global flag for detecting all links in text
 */
export const buildLinkPattern = (delimiters: DelimiterConfig): RegExp => {
  // Escape delimiters for regex matching
  const escapedHash = escapeRegex(delimiters.hash);
  const escapedLine = escapeRegex(delimiters.line);
  const escapedPosition = escapeRegex(delimiters.position);
  const escapedRange = escapeRegex(delimiters.range);

  // Build path pattern based on hash delimiter length
  // For single-char hashes: Use non-greedy (.+?) to allow hash in filenames
  //   - "file#1.ts#L10" → path="file#1.ts", hash="#" ✅
  //
  // For multi-char hashes: Use negative lookahead to prevent ambiguity
  //   - "file.ts>>>>line10" → path="file.ts", hash=">>>>" ✅
  //   - Without lookahead: path="file.ts>", hash=">>" ❌
  //
  // Trade-off: Multi-char delimiters cannot appear in filenames
  //
  // URL exclusion (two-layer defense):
  // 1. Pattern level: Negative lookbehind + lookahead prevents URLs from matching
  //    - Lookbehind: Path must NOT be preceded by URL characters [a-zA-Z0-9:/.]
  //      This stops matching at positions within a URL (e.g., 'ttps://...')
  //    - Lookahead: Path must NOT start with http://, https://, or ftp://
  //      This stops matching at the start of a URL
  // 2. parseLink level: Rejects any path containing "://" (catches edge cases)
  //
  // Allowed: file://, domain-like paths (github.com/...), Windows paths (C:\...)
  const pathPattern =
    delimiters.hash.length === 1
      ? `(${NOT_AFTER_URL_CHAR}${NO_WEB_URL_SCHEME}\\S+?)` // Single-char: URL exclusion + non-greedy
      : `(${NOT_AFTER_URL_CHAR}${NO_WEB_URL_SCHEME}(?:(?!${escapedHash})\\S)+)`; // Multi-char: URL exclusion + no hash

  // Build complete pattern
  // Pattern: (path)(hash{1,2})(line)(digits)(optional: position)(optional: range)
  //
  // Note: Using \\S+ (non-whitespace) for path instead of .+ because:
  // - Terminal lines may have multiple links separated by spaces
  // - We want to match individual links, not everything between them
  // - Example: "file1.ts#L10 file2.ts#L20" should match 2 links, not 1
  //
  // Hash quantifier: (?:${escapedHash}){1,2} means "hash delimiter 1 or 2 times"
  // - Single hash: "#" matches "#"
  // - Double hash: "##" matches "##" (rectangular mode)
  // - Multi-char: ">>" matches ">>" or ">>>>" (rectangular)
  const pattern = `${pathPattern}((?:${escapedHash}){1,2})${escapedLine}(\\d+)(?:${escapedPosition}(\\d+))?(?:${escapedRange}${escapedLine}(\\d+)(?:${escapedPosition}(\\d+))?)?`;

  // Return with global flag to find all matches in a line
  return new RegExp(pattern, 'g');
};
