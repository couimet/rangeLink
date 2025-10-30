import { DelimiterConfig } from '../types/DelimiterConfig';
import { RangeFormat } from '../types/RangeFormat';

/**
 * Build a range specification string using provided delimiters.
 * When rangeFormat is LineOnly, positions are omitted (line-only format).
 *
 * @param startLine 1-based start line number
 * @param endLine 1-based end line number
 * @param startPosition 1-based start character position (optional)
 * @param endPosition 1-based end character position (optional)
 * @param delimiters Delimiter configuration
 * @param rangeFormat Whether to include positions or just lines
 * @returns Formatted anchor string (e.g., "L10C5-L20C10" or "L10-L20")
 */
export function buildAnchor(
  startLine: number,
  endLine: number,
  startPosition: number | undefined,
  endPosition: number | undefined,
  delimiters: DelimiterConfig,
  rangeFormat: RangeFormat = RangeFormat.WithPositions,
): string {
  const { line: delimL, position: delimP, range: delimRange } = delimiters;

  if (rangeFormat === RangeFormat.LineOnly) {
    return `${delimL}${startLine}${delimRange}${delimL}${endLine}`;
  }

  const start = `${delimL}${startLine}${delimP}${startPosition ?? 1}`;
  const end = `${delimL}${endLine}${delimP}${endPosition ?? 1}`;
  return `${start}${delimRange}${end}`;
}

