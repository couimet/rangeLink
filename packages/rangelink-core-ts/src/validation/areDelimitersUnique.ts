import { DelimiterConfig } from '../types/DelimiterConfig';

/**
 * Validate all delimiters are unique (case-insensitive comparison).
 * This prevents user errors from inconsistent casing (e.g., "L" vs "l").
 *
 * @param delimiters The delimiter configuration to check
 * @returns true if all delimiters are unique, false otherwise
 */
export function areDelimitersUnique(delimiters: DelimiterConfig): boolean {
  const values = [delimiters.line, delimiters.position, delimiters.hash, delimiters.range];
  const lowerCaseValues = values.map((v) => v.toLowerCase());
  return new Set(lowerCaseValues).size === lowerCaseValues.length;
}
