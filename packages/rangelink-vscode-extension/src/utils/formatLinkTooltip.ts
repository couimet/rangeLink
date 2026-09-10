import { formatLinkPosition } from './formatLinkPosition';

import type { ParsedLink, ParsedTextLink } from 'rangelink-core-ts';

/**
 * Format tooltip text for a terminal or document link.
 *
 * Numeric RangeLinks show the full selection range; text highlight links show
 * the directive term they identify. Both include a subtle branding suffix to
 * build awareness.
 *
 * VSCode automatically appends the platform-specific click instruction
 * (e.g., "(cmd + click)" on macOS), so we don't include it manually.
 *
 * **Defensive validation:** Returns `undefined` if the parsed data is invalid
 * or missing required fields. VSCode will show no tooltip for the link, but
 * the link remains clickable.
 *
 * @param parsed - Parsed link data (numeric RangeLink or text highlight).
 * @returns Formatted tooltip text with branding, or `undefined` if data is invalid
 */
export const formatLinkTooltip = (parsed: ParsedLink | ParsedTextLink): string | undefined => {
  // Defensive validation: Check parsed data is usable
  if (!parsed) {
    return undefined;
  }

  // Validate path exists and is non-empty (shared by both link kinds)
  if (!parsed.path || typeof parsed.path !== 'string' || parsed.path.trim() === '') {
    return undefined;
  }

  // Text highlight links carry a content directive instead of numeric positions
  if ('directive' in parsed) {
    const { start } = parsed.directive;
    if (!start || typeof start !== 'string' || start.trim() === '') {
      return undefined;
    }
    return `Highlight "${start}" in ${parsed.path} • RangeLink`;
  }

  // Validate start position exists and has valid line number
  if (!parsed.start || typeof parsed.start.line !== 'number' || parsed.start.line < 1) {
    return undefined;
  }

  // Validate end position exists and has valid line number
  if (!parsed.end || typeof parsed.end.line !== 'number' || parsed.end.line < 1) {
    return undefined;
  }

  // Validate character properties if present (must be non-negative)
  if (parsed.start.character !== undefined && parsed.start.character < 0) {
    return undefined;
  }

  if (parsed.end.character !== undefined && parsed.end.character < 0) {
    return undefined;
  }

  // All validations passed - format the tooltip
  // Use formatLinkPosition to show full range (highlights RangeLink's value prop)
  const position = formatLinkPosition(parsed.start, parsed.end);

  return `Open ${parsed.path}:${position} • RangeLink`;
};
