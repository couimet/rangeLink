import os from 'node:os';
import path from 'node:path';

/**
 * Expand a raw file path to an absolute path string suitable for display.
 *
 * Performs pure path computation with no disk I/O — no existence checks.
 * Intended for tooltip display where the user sees the path they will navigate
 * to, rather than the raw token as it appeared in source text.
 *
 * - `~/…` paths are expanded using the OS home directory
 * - `./…` and `../…` paths are resolved relative to the directory containing
 *   the context file (e.g. the document being scanned)
 * - Absolute paths are returned unchanged
 *
 * @param rawPath - The file path string extracted from source text
 * @param contextFsPath - Filesystem path of the file that contains rawPath,
 *   used as the base for relative resolution
 * @returns Absolute path string for display purposes
 */
export const expandPathForDisplay = (rawPath: string, contextFsPath: string): string => {
  if (rawPath.startsWith('~/')) {
    return os.homedir() + rawPath.slice(1);
  }

  if (rawPath.startsWith('./') || rawPath.startsWith('../')) {
    return path.resolve(path.dirname(contextFsPath), rawPath);
  }

  return rawPath;
};
