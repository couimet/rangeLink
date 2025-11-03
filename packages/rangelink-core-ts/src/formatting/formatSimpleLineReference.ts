import { DelimiterConfig } from '../types/DelimiterConfig';

/**
 * Format a simple line reference using anchor notation (e.g., path#L10).
 * Used for single-line selections that span the full line.
 *
 * @param path File path
 * @param line 1-based line number
 * @param delimiters Delimiter configuration
 * @returns Formatted link (e.g., "src/file.ts#L10")
 */
export function formatSimpleLineReference(
  path: string,
  line: number,
  delimiters: DelimiterConfig,
): string {
  const { hash: delimHash, line: delimLine } = delimiters;
  return `${path}${delimHash}${delimLine}${line}`;
}
