import type { TerminalBindableQuickPickItem } from '../../types';
import type { TerminalLabelBuilder } from '../types';

import { buildTerminalDescription } from './buildTerminalDescription';

/**
 * Build display-ready QuickPick items from raw terminal items.
 *
 * Reformats labels via the provided builder and marks active/bound terminals.
 * Title and descriptions are drawn from shared MessageCode constants.
 */
export const buildTerminalPickerItems = (
  terminalItems: readonly TerminalBindableQuickPickItem[],
  buildLabel: TerminalLabelBuilder,
): TerminalBindableQuickPickItem[] =>
  terminalItems.map((item) => ({
    label: buildLabel(item.terminalInfo),
    description: buildTerminalDescription(item.terminalInfo),
    displayName: item.terminalInfo.name,
    bindOptions: item.bindOptions,
    itemKind: 'bindable' as const,
    isActive: item.isActive,
    boundState: item.boundState,
    terminalInfo: item.terminalInfo,
  }));
