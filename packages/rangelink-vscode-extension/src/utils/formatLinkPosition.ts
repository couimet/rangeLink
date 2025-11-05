import type { LinkPosition } from 'rangelink-core-ts';

/**
 * Format a link position range for display in UI messages.
 *
 * Formats start and end positions into a human-readable string for displaying
 * in tooltips, information messages, and logs. Handles various cases:
 * - Single position (start == end): "42:10" or "42"
 * - Range on different lines: "42:10-58:25"
 * - Range on same line: "10:5-10:15"
 * - Line-only (no column): "42" or "42-58"
 *
 * @param start - Start position (line and optional character)
 * @param end - End position (line and optional character)
 * @returns Formatted position string
 *
 * @example
 * ```typescript
 * // Single position with column
 * formatLinkPosition({ line: 42, char: 10 }, { line: 42, char: 10 });
 * // => "42:10"
 *
 * // Single line (no column)
 * formatLinkPosition({ line: 42 }, { line: 42 });
 * // => "42"
 *
 * // Range across multiple lines
 * formatLinkPosition({ line: 10, char: 5 }, { line: 20, char: 10 });
 * // => "10:5-20:10"
 *
 * // Range on same line
 * formatLinkPosition({ line: 10, char: 5 }, { line: 10, char: 15 });
 * // => "10:5-10:15"
 *
 * // Line-only range
 * formatLinkPosition({ line: 10 }, { line: 20 });
 * // => "10-20"
 * ```
 */
export const formatLinkPosition = (start: LinkPosition, end: LinkPosition): string => {
  // Format individual positions
  const startPos = start.char !== undefined ? `${start.line}:${start.char}` : `${start.line}`;
  const endPos = end.char !== undefined ? `${end.line}:${end.char}` : `${end.line}`;

  // Check if start and end are the same position
  const isSamePosition = start.line === end.line && start.char === end.char;

  // Return single position or range
  return isSamePosition ? startPos : `${startPos}-${endPos}`;
};
