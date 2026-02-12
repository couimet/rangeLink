import { needsQuoting } from './needsQuoting';

/**
 * Wrap an entire RangeLink in single quotes when its path has unsafe characters.
 *
 * Extracts the path portion (everything before the first `#`), checks if it needs
 * quoting, and wraps the complete link in quotes. Embedded single quotes in the
 * path are escaped using the POSIX `'\''` sequence.
 *
 * Safe-path links are returned unchanged.
 *
 * @param link - Complete RangeLink string (e.g., "My Folder/file.ts#L10")
 * @param path - The path portion of the link (used for the needs-quoting check)
 * @returns Quoted link when path is unsafe, original link when safe
 */
export const quoteLink = (link: string, path: string): string => {
  if (!needsQuoting(path)) return link;
  const escaped = link.replace(/'/g, "'\\''");
  return `'${escaped}'`;
};
