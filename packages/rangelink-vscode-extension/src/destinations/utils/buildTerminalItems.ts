import { messagesEn } from '../../i18n/messages.en';
import {
  type AnyPickerItem,
  MessageCode,
  type TerminalMorePickerItem,
  type TerminalPickerItem,
} from '../../types';

import type { EligibleTerminal } from './isTerminalDestinationEligible';

/**
 * Builds picker items for terminal destinations.
 *
 * Returns only terminal items and optionally a "More..." overflow item.
 * Separators are NOT included - they are a UI concern handled during
 * QuickPickItem conversion.
 *
 * @param terminals - Array of eligible terminals from isTerminalDestinationEligible
 * @param maxInline - Maximum terminals to show before adding "More..." item
 * @returns Array of terminal-related items: terminal items and optionally "More..."
 */
export const buildTerminalItems = (
  terminals: readonly EligibleTerminal[],
  maxInline: number,
): AnyPickerItem[] => {
  const items: AnyPickerItem[] = [];

  const needsMoreItem = terminals.length > maxInline;
  const terminalsToShowCount = needsMoreItem ? maxInline - 1 : terminals.length;
  const terminalsToShow = terminals.slice(0, terminalsToShowCount);

  for (const { terminal, name, isActive } of terminalsToShow) {
    items.push({
      kind: 'terminal',
      terminal,
      displayName: name,
      isActive,
    } satisfies TerminalPickerItem);
  }

  if (needsMoreItem) {
    items.push({
      kind: 'terminal-more',
      displayName: messagesEn[MessageCode.TERMINAL_PICKER_MORE_LABEL],
      remainingCount: terminals.length - terminalsToShowCount,
    } satisfies TerminalMorePickerItem);
  }

  return items;
};
