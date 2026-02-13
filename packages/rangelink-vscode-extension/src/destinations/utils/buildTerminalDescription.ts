import type { EligibleTerminal } from '../../types';
import { MessageCode } from '../../types';
import { formatMessage } from '../../utils';

/**
 * Build a description string for a terminal QuickPick item.
 * Combines "bound" and "active" badges separated by " · ".
 */
export const buildTerminalDescription = (info: EligibleTerminal): string | undefined => {
  const badges: string[] = [];
  if (info.boundState === 'bound') {
    badges.push(formatMessage(MessageCode.TERMINAL_PICKER_BOUND_DESCRIPTION));
  }
  if (info.isActive) {
    badges.push(formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION));
  }
  return badges.length > 0 ? badges.join(' \u00b7 ') : undefined;
};
