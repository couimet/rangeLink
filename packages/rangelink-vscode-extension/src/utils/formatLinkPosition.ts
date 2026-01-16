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
 */
export const formatLinkPosition = (start: LinkPosition, end: LinkPosition): string => {
  // Format individual positions
  const startPos =
    start.character !== undefined ? `${start.line}:${start.character}` : `${start.line}`;
  const endPos = end.character !== undefined ? `${end.line}:${end.character}` : `${end.line}`;

  // Check if start and end are the same position
  const isSamePosition = start.line === end.line && start.character === end.character;

  // Return single position or range
  return isSamePosition ? startPos : `${startPos}-${endPos}`;
};
