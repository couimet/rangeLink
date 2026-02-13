import * as vscode from 'vscode';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import {
  type BindableQuickPickItem,
  DESTINATION_KINDS,
  type DestinationQuickPickItem,
  type DestinationKind,
  type GroupedDestinationItems,
  MessageCode,
  type TerminalBindableQuickPickItem,
  type TerminalMoreQuickPickItem,
} from '../../types';
import { formatMessage } from '../../utils';

import { buildTerminalDescription } from './buildTerminalDescription';

const isDestinationKind = (key: string): key is DestinationKind =>
  DESTINATION_KINDS.includes(key as DestinationKind);

const isTerminalItem = (item: BindableQuickPickItem): item is TerminalBindableQuickPickItem =>
  'terminalInfo' in item;

type PickerSequenceKey = DestinationKind | 'terminal-more';

/**
 * Sequence defining the order of destination kinds in QuickPick menus.
 * AI assistants first, then terminals, then text editor.
 */
export const DESTINATION_PICKER_SEQUENCE: readonly PickerSequenceKey[] = [
  'claude-code',
  'cursor-ai',
  'github-copilot-chat',
  'terminal',
  'terminal-more',
  'text-editor',
] as const;

type DestinationGroup = 'ai' | 'terminal' | 'file';

const DESTINATION_GROUP_MAP: Record<PickerSequenceKey, DestinationGroup> = {
  'claude-code': 'ai',
  'cursor-ai': 'ai',
  'github-copilot-chat': 'ai',
  terminal: 'terminal',
  'terminal-more': 'terminal',
  'text-editor': 'file',
};

const DESTINATION_GROUP_LABELS: Record<DestinationGroup, MessageCode> = {
  ai: MessageCode.DESTINATION_GROUP_AI_ASSISTANTS,
  terminal: MessageCode.DESTINATION_GROUP_TERMINALS,
  file: MessageCode.DESTINATION_GROUP_FILES,
};

/**
 * Callback for customizing the label displayed for each destination item.
 * @param displayName - The destination's display name
 * @returns The formatted label string
 */
export type LabelBuilder = (displayName: string) => string;

/**
 * Build QuickPick items from grouped destinations.
 *
 * Items are ordered by DESTINATION_PICKER_SEQUENCE with visual separators
 * between logical groups (AI assistants, terminals, files).
 *
 * @param grouped - Grouped destination items from DestinationAvailabilityService
 * @param buildLabel - Callback to customize item labels
 * @returns Array of QuickPick items with separators between groups
 */
export const buildDestinationQuickPickItems = (
  grouped: GroupedDestinationItems,
  buildLabel: LabelBuilder,
): (DestinationQuickPickItem | vscode.QuickPickItem)[] => {
  const items: (DestinationQuickPickItem | vscode.QuickPickItem)[] = [];
  let currentGroup: DestinationGroup | undefined;

  for (const key of DESTINATION_PICKER_SEQUENCE) {
    const groupItems = grouped[key];
    if (!groupItems) continue;

    const nextGroup = DESTINATION_GROUP_MAP[key];
    if (nextGroup !== currentGroup) {
      items.push({
        label: formatMessage(DESTINATION_GROUP_LABELS[nextGroup]),
        kind: vscode.QuickPickItemKind.Separator,
      });
      currentGroup = nextGroup;
    }

    if (key === 'terminal-more') {
      const item = groupItems as TerminalMoreQuickPickItem;
      items.push({
        ...item,
        label: buildLabel(item.displayName),
        description: formatMessage(MessageCode.TERMINAL_PICKER_MORE_TERMINALS_DESCRIPTION, {
          count: item.remainingCount,
        }),
      });
      continue;
    }

    if (!isDestinationKind(key)) {
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
        message: `Invalid destination kind in picker sequence: ${key}`,
        functionName: 'buildDestinationQuickPickItems',
        details: { key },
      });
    }

    for (const item of groupItems as BindableQuickPickItem[]) {
      if (!isDestinationKind(item?.bindOptions?.kind)) {
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
          message: `Invalid destination kind in bindOptions`,
          functionName: 'buildDestinationQuickPickItems',
          details: { item, key },
        });
      }

      const description = isTerminalItem(item)
        ? buildTerminalDescription(item.terminalInfo)
        : undefined;

      items.push({
        ...item,
        label: buildLabel(item.displayName),
        description,
      });
    }
  }

  return items;
};
