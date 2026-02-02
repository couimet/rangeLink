import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import {
  type BindableQuickPickItem,
  DESTINATION_TYPES,
  type DestinationType,
  type GroupedDestinationItems,
  MessageCode,
  type TerminalMoreQuickPickItem,
} from '../../types';
import { formatMessage } from '../../utils';

const isDestinationType = (key: string): key is DestinationType =>
  DESTINATION_TYPES.includes(key as DestinationType);

/**
 * Sequence defining the order of destination types in QuickPick menus.
 * AI assistants first, then terminals, then text editor.
 */
export const DESTINATION_PICKER_SEQUENCE: readonly (DestinationType | 'terminal-more')[] = [
  'claude-code',
  'cursor-ai',
  'github-copilot-chat',
  'terminal',
  'terminal-more',
  'text-editor',
] as const;

/**
 * Callback for customizing the label displayed for each destination item.
 * @param displayName - The destination's display name
 * @returns The formatted label string
 */
export type LabelBuilder = (displayName: string) => string;

/**
 * Build QuickPick items from grouped destinations.
 *
 * Items are ordered by DESTINATION_PICKER_SEQUENCE and include
 * appropriate descriptions (e.g., "active" for active terminal).
 *
 * @param grouped - Grouped destination items from DestinationAvailabilityService
 * @param buildLabel - Callback to customize item labels
 * @returns Array of QuickPick items ready for display
 */
export const buildDestinationQuickPickItems = (
  grouped: GroupedDestinationItems,
  buildLabel: LabelBuilder,
): (BindableQuickPickItem | TerminalMoreQuickPickItem)[] => {
  const items: (BindableQuickPickItem | TerminalMoreQuickPickItem)[] = [];

  for (const key of DESTINATION_PICKER_SEQUENCE) {
    const groupItems = grouped[key];
    if (!groupItems) continue;

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

    if (!isDestinationType(key)) {
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_TYPE,
        message: `Invalid destination type in picker sequence: ${key}`,
        functionName: 'buildDestinationQuickPickItems',
        details: { key },
      });
    }

    for (const item of groupItems as BindableQuickPickItem[]) {
      if (!isDestinationType(item?.bindOptions?.type)) {
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_TYPE,
          message: `Invalid destination type in bindOptions`,
          functionName: 'buildDestinationQuickPickItems',
          details: { item, key },
        });
      }

      items.push({
        ...item,
        label: buildLabel(item.displayName),
        description: item.isActive
          ? formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION)
          : undefined,
      });
    }
  }

  return items;
};
