/**
 * Maximum allowed length for a RangeLink string during parsing.
 *
 * This safety net prevents potential performance issues or DoS attacks
 * from parsing extremely long strings. The limit is generous enough to
 * accommodate very long absolute file paths with complex range specifications.
 *
 * Example maximum-length link:
 * - Path: ~2700 chars (Windows MAX_PATH is 260, modern paths can be ~32K, but practical is much less)
 * - Anchor: ~300 chars (delimiters + line numbers + positions)
 * - Total: 3000 chars is very generous for real-world usage
 *
 * @constant {number} MAX_LINK_LENGTH - Maximum characters allowed in link string
 */
export const MAX_LINK_LENGTH = 3000;
