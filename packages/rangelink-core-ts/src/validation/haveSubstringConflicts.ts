import { DelimiterConfig } from '../types/DelimiterConfig';

/**
 * Check for substring conflicts between delimiters (case-insensitive).
 * Prevents ambiguous parsing by ensuring no delimiter is a substring of another.
 *
 * @param delimiters The delimiter configuration to check
 * @returns true if there are substring conflicts, false otherwise
 */
export function haveSubstringConflicts(delimiters: DelimiterConfig): boolean {
  const values = [delimiters.line, delimiters.position, delimiters.hash, delimiters.range];

  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;

      const a = values[i].toLowerCase();
      const b = values[j].toLowerCase();

      if (a.length === 0 || b.length === 0) continue;

      if (a.includes(b)) {
        return true;
      }
    }
  }

  return false;
}
