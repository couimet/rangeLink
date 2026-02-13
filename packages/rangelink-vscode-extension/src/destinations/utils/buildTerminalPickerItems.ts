import type { TerminalBindableQuickPickItem } from '../../types';
import { MessageCode } from '../../types';
import { formatMessage } from '../../utils';
import type { TerminalLabelBuilder } from '../types';

/**
 * Build display-ready QuickPick items from raw terminal items.
 *
 * Reformats labels via the provided builder and marks active terminals.
 * Title and active description are drawn from shared MessageCode constants.
 */
export const buildTerminalPickerItems = (
  terminalItems: readonly TerminalBindableQuickPickItem[],
  buildLabel: TerminalLabelBuilder,
): TerminalBindableQuickPickItem[] =>
  terminalItems.map((item) => ({
    label: buildLabel(item.terminalInfo),
    description: item.terminalInfo.isActive
      ? formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION)
      : undefined,
    displayName: item.terminalInfo.name,
    bindOptions: item.bindOptions,
    itemKind: 'bindable' as const,
    isActive: item.isActive,
    terminalInfo: item.terminalInfo,
  }));
