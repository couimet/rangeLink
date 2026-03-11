import { DelimiterConfig } from '../types/DelimiterConfig';

import { escapeRegex } from './escapeRegex';

/**
 * URL exclusion patterns for RangeLink and file path detection.
 *
 * These prevent web URLs from being matched as links:
 * - NOT_AFTER_URL_CHAR: Lookbehind to block matches mid-URL (exported for reuse in file path detection)
 * - NO_WEB_URL_SCHEME: Lookahead to block matches at URL scheme start
 */
export const NOT_AFTER_URL_CHAR = '(?<![a-zA-Z0-9:/._?&=%~\\-\\]])';
const NO_WEB_URL_SCHEME = '(?![hH][tT][tT][pP][sS]?://|[fF][tT][pP]://)';

/**
 * Path character class for RangeLink detection.
 *
 * Matches any non-whitespace character EXCEPT common text wrapper characters.
 * These are excluded because they frequently surround links in prose and markdown
 * but are never (or practically never) part of real file paths.
 *
 * Excluded: \x60 (backtick), \x27 (single quote), \x22 (double quote), < >, \x5d (])
 *
 * ] is excluded to prevent matching the markdown link boundary `](url)` as part of a path.
 * NOT excluded: ( ) [ { } — these appear in real directory/file names.
 */
const PATH_CHAR = '[^\\s\\x60\\x27\\x22<>\\x5d]';

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
      ? `(${NOT_AFTER_URL_CHAR}${NO_WEB_URL_SCHEME}${PATH_CHAR}+?)` // Single-char: URL exclusion + non-greedy
      : `(${NOT_AFTER_URL_CHAR}${NO_WEB_URL_SCHEME}(?:(?!${escapedHash})${PATH_CHAR})+)`; // Multi-char: URL exclusion + no hash

  // Build complete pattern
  // Pattern: (path)(hash{1,2})(line)(digits)(optional: position)(optional: range)
  //
  // Note: Using PATH_CHAR+ (non-whitespace, non-backtick) for path instead of .+ because:
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

/**
 * Extract the file path string from a regex match produced by buildFilePathPattern().
 *
 * Double-quoted matches capture path content (without quotes) in named group `dq`.
 * Single-quoted matches capture path content (without quotes) in named group `sq`.
 * All other patterns produce no named groups — match[0] is the full unquoted path.
 */
export const extractFilePath = (match: RegExpExecArray): string =>
  match.groups?.dq ?? match.groups?.sq ?? match[0];

/**
 * Builds a RegExp pattern for detecting plain file paths in text.
 *
 * Extends URL exclusion from buildLinkPattern for consistent detection behaviour.
 * Supports quoted paths (with spaces), absolute, relative, and tilde-prefixed paths.
 * Paths inside common wrappers (`{}`, `[]`, `()`, markdown links) are detected
 * correctly because wrapper characters are not part of the matched path.
 *
 * The delimiter config is used to derive the RangeLink coexistence lookahead so that
 * paths immediately followed by any valid RangeLink suffix (single or double hash,
 * including rectangular `##` mode and custom delimiter pairs) are excluded —
 * RangeLinkDocumentProvider / RangeLinkTerminalProvider own those matches.
 *
 * **Supported formats:**
 * - Double-quoted: `"/path/with spaces/file.ts"` — group `dq` captures content
 * - Single-quoted: `'/path/to/file.ts'` — group `sq` captures content
 * - Absolute unquoted: `/path/to/file.ts`
 * - Relative: `./file.ts` or `../file.ts`
 * - Tilde: `~/file.ts`
 *
 * Use extractFilePath() to get the clean path string from a match (strips quotes).
 *
 * @param delimiters - Delimiter configuration to use for pattern
 * @returns RegExp with global flag for detecting all file paths in text
 */
export const buildFilePathPattern = (delimiters: DelimiterConfig): RegExp => {
  const escapedHash = escapeRegex(delimiters.hash);
  const escapedLine = escapeRegex(delimiters.line);

  // Backtracking guard: (?!\w) prevents \w+ from giving back chars to let the
  // RangeLink suffix slip through. The second alternative blocks single-hash,
  // double-hash (rectangular), and custom-delimiter suffixes.
  const notBeforeRangeLink = `(?!\\w|(?:${escapedHash}){1,2}${escapedLine}\\d)`;

  // Quoted patterns: NO_WEB_URL_SCHEME inside the opening quote blocks quoted URLs
  // like "https://example.com/file.ts" from being matched as local file paths.
  const doubleQuoted = `"${NO_WEB_URL_SCHEME}(?<dq>[^"\\n\`?*]*/[^"\\n\`?*]*\\.\\w+)"`;
  const singleQuoted = `'${NO_WEB_URL_SCHEME}(?<sq>[^'\\n\`?*]*/[^'\\n\`?*]*\\.\\w+)'`;

  // Unquoted patterns: NOT_AFTER_URL_CHAR prevents matching path segments that
  // are embedded inside web URLs (e.g., https://example.com/./file.ts or ~/user).
  const absolute = `${NOT_AFTER_URL_CHAR}/[\\w\\-./@]+\\.\\w+${notBeforeRangeLink}`;
  const relative = `${NOT_AFTER_URL_CHAR}\\.{1,2}/[\\w\\-./@]+\\.\\w+${notBeforeRangeLink}`;
  const tilde = `${NOT_AFTER_URL_CHAR}~/[\\w\\-./@]+\\.\\w+${notBeforeRangeLink}`;

  return new RegExp(`${doubleQuoted}|${singleQuoted}|${absolute}|${relative}|${tilde}`, 'g');
};
