import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import {
  type BindableQuickPickItem,
  DESTINATION_KINDS,
  type DestinationQuickPickItem,
  type DestinationKind,
  type GroupedDestinationItems,
  MessageCode,
  type TerminalMoreQuickPickItem,
} from '../../types';
import { formatMessage } from '../../utils';

const isDestinationKind = (key: string): key is DestinationKind =>
  DESTINATION_KINDS.includes(key as DestinationKind);

/**
 * Sequence defining the order of destination kinds in QuickPick menus.
 * AI assistants first, then terminals, then text editor.
 */
export const DESTINATION_PICKER_SEQUENCE: readonly (DestinationKind | 'terminal-more')[] = [
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
 * appropriate description.
 *
 * @param grouped - Grouped destination items from DestinationAvailabilityService
 * @param buildLabel - Callback to customize item labels
 * @returns Array of QuickPick items ready for display
 */
export const buildDestinationQuickPickItems = (
  grouped: GroupedDestinationItems,
  buildLabel: LabelBuilder,
): DestinationQuickPickItem[] => {
  const items: DestinationQuickPickItem[] = [];

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
