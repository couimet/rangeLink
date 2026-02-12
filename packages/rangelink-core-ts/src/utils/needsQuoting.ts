/**
 * Regex matching characters that are safe in all link contexts.
 * Paths containing only these characters do not need quoting.
 *
 * Includes: letters, digits, underscore, hyphen, period, forward slash, colon.
 * Excludes: spaces, parentheses, ampersands, shell metacharacters, etc.
 */
const SAFE_PATH_CHARS = /^[A-Za-z0-9_.\-/:]+$/;

/**
 * Check whether a path contains characters that require quoting for safe transport.
 *
 * Returns true when the path has characters outside the safe set (letters, digits,
 * `_`, `-`, `.`, `/`, `:`). These unsafe characters (spaces, parentheses, shell
 * metacharacters, etc.) can break link recognition in terminals, shells, and text
 * scanning contexts.
 *
 * @param path - File path to check (relative or absolute)
 * @returns true if path needs quoting, false if all characters are safe
 */
export const needsQuoting = (path: string): boolean => {
  if (!path) return false;
  return !SAFE_PATH_CHARS.test(path);
};
