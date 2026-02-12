import { needsQuoting } from './needsQuoting';

/**
 * Wrap a path in single quotes with POSIX escaping for embedded single quotes.
 *
 * Embedded `'` characters are escaped using the POSIX `'\''` sequence:
 * end current quote, emit literal `'`, start new quote.
 *
 * Only quotes when the path has unsafe characters. Safe paths are returned unchanged.
 *
 * @param path - File path to quote (just the path portion, no anchor)
 * @returns Quoted path when unsafe, original path when safe
 */
export const quotePath = (path: string): string => {
  if (!needsQuoting(path)) return path;
  const escaped = path.replace(/'/g, "'\\''");
  return `'${escaped}'`;
};
