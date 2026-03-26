import * as vscode from 'vscode';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import {
  type BindableQuickPickItem,
  DESTINATION_KINDS,
  type DestinationQuickPickItem,
  type DestinationKind,
  isCustomAiAssistantKind,
  type FileBindableQuickPickItem,
  type FileMoreQuickPickItem,
  type GroupedDestinationItems,
  MessageCode,
  type TerminalBindableQuickPickItem,
  type TerminalMoreQuickPickItem,
} from '../../types';
import { formatMessage } from '../../utils';

import { buildTerminalDescription } from './buildTerminalDescription';

const isDestinationKind = (key: string): key is DestinationKind =>
  (DESTINATION_KINDS as readonly string[]).includes(key) || key.startsWith('custom-ai:');

const isTerminalItem = (item: BindableQuickPickItem): item is TerminalBindableQuickPickItem =>
  'terminalInfo' in item;

const isFileItem = (item: BindableQuickPickItem): item is FileBindableQuickPickItem =>
  'fileInfo' in item;

type PickerSequenceKey = DestinationKind | 'file-more' | 'terminal-more';

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
  'file-more',
] as const;

type DestinationGroup = 'ai' | 'terminal' | 'file';

const DESTINATION_GROUP_MAP: Record<PickerSequenceKey, DestinationGroup> = {
  'claude-code': 'ai',
  'cursor-ai': 'ai',
  'github-copilot-chat': 'ai',
  terminal: 'terminal',
  'terminal-more': 'terminal',
  'text-editor': 'file',
  'file-more': 'file',
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

  const customAiKinds = Object.keys(grouped).filter(
    (key) => isCustomAiAssistantKind(key) && grouped[key as keyof GroupedDestinationItems],
  );
  const fullSequence: PickerSequenceKey[] = [
    ...DESTINATION_PICKER_SEQUENCE.slice(0, 3),
    ...(customAiKinds as PickerSequenceKey[]),
    ...DESTINATION_PICKER_SEQUENCE.slice(3),
  ];

  for (const key of fullSequence) {
    const groupItems = grouped[key];
    if (!groupItems) continue;

    const nextGroup = DESTINATION_GROUP_MAP[key] ?? (isCustomAiAssistantKind(key) ? 'ai' : undefined);
    if (!nextGroup) continue;
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

    if (key === 'file-more') {
      const item = groupItems as FileMoreQuickPickItem;
      items.push({
        ...item,
        label: buildLabel(item.displayName),
        description: formatMessage(MessageCode.FILE_PICKER_MORE_FILES_DESCRIPTION, {
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

      const groupLabel = isFileItem(item)
        ? formatMessage(MessageCode.FILE_PICKER_GROUP_FORMAT, { index: item.fileInfo.viewColumn })
        : undefined;
      const description = isTerminalItem(item)
        ? buildTerminalDescription(item.terminalInfo)
        : isFileItem(item)
          ? item.description !== undefined
            ? `${item.description} · ${groupLabel}`
            : groupLabel
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
