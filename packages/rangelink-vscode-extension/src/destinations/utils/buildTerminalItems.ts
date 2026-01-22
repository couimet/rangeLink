import { messagesEn } from '../../i18n/messages.en';
import {
  type AvailableDestinationItem,
  MessageCode,
  type TerminalItem,
  type TerminalMoreItem,
  type TerminalSeparatorItem,
} from '../../types';

import type { EligibleTerminal } from './isTerminalDestinationEligible';

/**
 * Builds QuickPick items for terminal destinations.
 *
 * @param terminals - Array of eligible terminals from isTerminalDestinationEligible
 * @param separatorLabel - Display label for the terminal separator item
 * @param maxInline - Maximum terminals to show before adding "More..." item
 * @returns Array of terminal-related items: separator, terminal items, and optionally "More..."
 */
export const buildTerminalItems = (
  terminals: readonly EligibleTerminal[],
  separatorLabel: string,
  maxInline: number,
): AvailableDestinationItem[] => {
  const items: AvailableDestinationItem[] = [];

  items.push({
    kind: 'terminal-separator',
    displayName: separatorLabel,
  } satisfies TerminalSeparatorItem);

  const needsMoreItem = terminals.length > maxInline;
  const terminalsToShowCount = needsMoreItem ? maxInline - 1 : terminals.length;
  const terminalsToShow = terminals.slice(0, terminalsToShowCount);

  for (const { terminal, name, isActive } of terminalsToShow) {
    items.push({
      kind: 'terminal',
      terminal,
      displayName: name,
      isActive,
    } satisfies TerminalItem);
  }

  if (needsMoreItem) {
    items.push({
      kind: 'terminal-more',
      displayName: messagesEn[MessageCode.TERMINAL_PICKER_MORE_LABEL],
      remainingCount: terminals.length - terminalsToShowCount,
    } satisfies TerminalMoreItem);
  }

  return items;
};
