import type { EligibleTerminal } from '../../types';
import { MessageCode } from '../../types';
import { formatMessage } from '../../utils';

/**
 * Build a description string for a terminal QuickPick item.
 * Combines "bound", "active", and "not bindable" badges separated by " · ".
 *
 * A non-bindable terminal is never `bound` (binding is rejected upstream), so
 * those two badges do not co-occur in practice. `active` and `not bindable`
 * can co-occur and are emitted in that order.
 */
export const buildTerminalDescription = (info: EligibleTerminal): string | undefined => {
  const badges: string[] = [];
  if (info.boundState === 'bound') {
    badges.push(formatMessage(MessageCode.TERMINAL_PICKER_BOUND_DESCRIPTION));
  }
  if (info.isActive) {
    badges.push(formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION));
  }
  if (info.nonBindableReason !== undefined) {
    badges.push(formatMessage(MessageCode.TERMINAL_PICKER_NOT_BINDABLE_DESCRIPTION));
  }
  return badges.length > 0 ? badges.join(' \u00b7 ') : undefined;
};
