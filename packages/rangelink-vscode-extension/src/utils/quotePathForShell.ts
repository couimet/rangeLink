/**
 * Regex pattern matching characters that are safe in shell environments.
 * Safe characters don't require quoting when used in file paths.
 *
 * Includes:
 * - A-Z, a-z (letters)
 * - 0-9 (digits)
 * - _ (underscore)
 * - - (hyphen)
 * - . (period)
 * - / (forward slash - path separator)
 * - : (colon - for Windows drive letters like C:)
 *
 * Excludes backslash intentionally as it has special meaning in shells.
 */
const SAFE_PATH_CHARS = /^[A-Za-z0-9_.\-/:]+$/;

/**
 * Checks if a file path contains only shell-safe characters.
 *
 * @param path - The file path to check
 * @returns true if path contains only safe characters, false otherwise
 */
export const isShellSafePath = (path: string): boolean => {
  return SAFE_PATH_CHARS.test(path);
};

/**
 * Wraps a file path in single quotes if it contains characters
 * that need escaping in shell environments.
 *
 * Only quotes when necessary to be less intrusive:
 * - Safe paths (A-Z, a-z, 0-9, _, -, ., /, :) are returned unchanged
 * - Paths with spaces, parentheses, etc. are wrapped in single quotes
 * - Existing single quotes are escaped using the POSIX `'\''` sequence
 *
 * Uses single quotes to match Cursor's drag-drop-to-terminal behavior.
 *
 * @param path - The file path to quote if needed
 * @returns The path, quoted if necessary for shell safety
 */
export const quotePathForShell = (path: string): string => {
  if (isShellSafePath(path)) {
    return path;
  }

  const escapedPath = path.replace(/'/g, "'\\''");
  return `'${escapedPath}'`;
};
