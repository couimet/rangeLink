import { DelimiterConfig } from '../types/DelimiterConfig';
import { escapeRegex } from './escapeRegex';

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
 *
 * @example
 * ```typescript
 * const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
 * const line = "Check src/file.ts#L10 and test.ts#L20";
 * const matches = [...line.matchAll(pattern)];
 * // matches.length === 2
 * // matches[0][0] === "src/file.ts#L10"
 * // matches[1][0] === "test.ts#L20"
 * ```
 *
 * @example
 * ```typescript
 * // Hash in filename
 * const pattern = buildLinkPattern(DEFAULT_DELIMITERS);
 * const line = "Error in file#1.ts#L42";
 * const match = pattern.exec(line);
 * // match[0] === "file#1.ts#L42"
 * // match[1] === "file#1.ts" (path with hash)
 * ```
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
  const pathPattern =
    delimiters.hash.length === 1
      ? '(\\S+?)' // Single-char: non-whitespace, non-greedy
      : `((?:(?!${escapedHash})\\S)+)`; // Multi-char: non-whitespace excluding hash

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
