/**
 * Escapes special regex characters in a string for safe use in RegExp.
 *
 * When building regex patterns dynamically from user-configured strings
 * (like custom delimiters), special regex characters must be escaped to
 * be treated as literals rather than metacharacters.
 *
 * Special characters escaped: . * + ? ^ $ { } ( ) | [ ] \
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in RegExp
 *
 * @example
 * ```typescript
 * escapeRegex('L10-L20')  → 'L10\\-L20'
 * escapeRegex('file.ts')  → 'file\\.ts'
 * escapeRegex('a+b')      → 'a\\+b'
 * escapeRegex('hash#')    → 'hash#'  (# is not special in regex)
 * ```
 */
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
