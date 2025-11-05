import type { ParsedLink } from 'rangelink-core-ts';

import { formatLinkPosition } from './formatLinkPosition';

/**
 * Format tooltip text for a terminal link.
 *
 * Generates user-friendly tooltip text for RangeLink terminal links.
 * Shows the full selection range to highlight RangeLink's value prop.
 * Includes subtle branding suffix to build awareness.
 *
 * VSCode automatically appends the platform-specific click instruction
 * (e.g., "(cmd + click)" on macOS), so we don't include it manually.
 *
 * **Defensive validation:** Returns `undefined` if the parsed data is invalid
 * or missing required fields. VSCode will show no tooltip for the link, but
 * the link remains clickable.
 *
 * @param parsed - Parsed link data. Should contain valid path and position data.
 * @returns Formatted tooltip text with branding, or `undefined` if data is invalid
 *
 * @example
 * ```typescript
 * // Single position
 * const parsed: ParsedLink = {
 *   path: 'src/auth.ts',
 *   start: { line: 42, char: 10 },
 *   end: { line: 42, char: 10 },
 *   linkType: 'Regular',
 *   selectionType: 'Normal'
 * };
 * formatLinkTooltip(parsed);
 * // => "Open src/auth.ts:42:10 • RangeLink"
 * // VSCode adds: " (cmd + click)" automatically
 *
 * // Range selection - shows RangeLink's power!
 * const parsed2: ParsedLink = {
 *   path: 'src/file.ts',
 *   start: { line: 10 },
 *   end: { line: 20 },
 *   linkType: 'Regular',
 *   selectionType: 'Normal'
 * };
 * formatLinkTooltip(parsed2);
 * // => "Open src/file.ts:10-20 • RangeLink"
 *
 * // Invalid data - returns undefined
 * formatLinkTooltip(null as any);
 * // => undefined
 * ```
 */
export const formatLinkTooltip = (parsed: ParsedLink): string | undefined => {
  // Defensive validation: Check parsed data is usable
  if (!parsed) {
    return undefined;
  }

  // Validate path exists and is non-empty
  if (!parsed.path || typeof parsed.path !== 'string' || parsed.path.trim() === '') {
    return undefined;
  }

  // Validate start position exists and has valid line number
  if (!parsed.start || typeof parsed.start.line !== 'number' || parsed.start.line < 1) {
    return undefined;
  }

  // Validate end position exists and has valid line number
  if (!parsed.end || typeof parsed.end.line !== 'number' || parsed.end.line < 1) {
    return undefined;
  }

  // Validate char properties if present (must be non-negative)
  if (parsed.start.char !== undefined && parsed.start.char < 0) {
    return undefined;
  }

  if (parsed.end.char !== undefined && parsed.end.char < 0) {
    return undefined;
  }

  // All validations passed - format the tooltip
  // Use formatLinkPosition to show full range (highlights RangeLink's value prop)
  const position = formatLinkPosition(parsed.start, parsed.end);

  return `Open ${parsed.path}:${position} • RangeLink`;
};
