import type { ParsedLink } from 'rangelink-core-ts';

import { formatLinkPosition } from './formatLinkPosition';
import { getPlatformModifierKey } from './getPlatformModifierKey';

/**
 * Format tooltip text for a terminal link based on parse result.
 *
 * Generates user-friendly tooltip text for RangeLink terminal links with
 * platform-aware modifier key labels (Cmd on macOS, Ctrl on Windows/Linux).
 * Shows the full selection range to highlight RangeLink's value prop.
 * Includes subtle branding suffix to build awareness.
 *
 * - **Parse success:** Shows "Open {path}:{position} ({modifier}+Click) • RangeLink" with full range
 * - **Parse failure:** Shows generic "Open in editor ({modifier}+Click) • RangeLink" fallback
 *
 * @param parsed - Parsed link data, or undefined if parsing failed
 * @returns Formatted tooltip text with platform-specific modifier key and branding
 *
 * @example
 * ```typescript
 * // Single position (macOS)
 * const parsed: ParsedLink = {
 *   path: 'src/auth.ts',
 *   start: { line: 42, char: 10 },
 *   end: { line: 42, char: 10 },
 *   linkType: 'Regular',
 *   selectionType: 'Normal'
 * };
 * formatLinkTooltip(parsed);
 * // => "Open src/auth.ts:42:10 (Cmd+Click) • RangeLink"
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
 * // => "Open src/file.ts:10-20 (Cmd+Click) • RangeLink"
 *
 * // Parse failure
 * formatLinkTooltip(undefined);
 * // => "Open in editor (Cmd+Click) • RangeLink"
 * ```
 */
export const formatLinkTooltip = (parsed: ParsedLink | undefined): string => {
  const modifier = getPlatformModifierKey();

  if (parsed === undefined) {
    return `Open in editor (${modifier}+Click) • RangeLink`;
  }

  // Use formatLinkPosition to show full range (highlights RangeLink's value prop)
  const position = formatLinkPosition(parsed.start, parsed.end);

  return `Open ${parsed.path}:${position} (${modifier}+Click) • RangeLink`;
};
