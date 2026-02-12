import type { Logger } from 'barebone-logger';

import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type {
  EligibleTerminal,
  TerminalBindableQuickPickItem,
  TerminalMoreQuickPickItem,
} from '../../types';

/** Pass to maxItemsBeforeMore to show all terminals without "More..." grouping */
export const TERMINAL_PICKER_SHOW_ALL = Infinity;

/**
 * Options for configuring the terminal picker behavior and display.
 */
export interface TerminalPickerOptions {
  /** Maximum terminals to show before adding "More..." item. Use TERMINAL_PICKER_SHOW_ALL to show all. */
  readonly maxItemsBeforeMore: number;
  /** QuickPick title */
  readonly title: string;
  /** QuickPick placeholder text */
  readonly placeholder: string;
  /** Description shown for the active terminal (e.g., "(active)") */
  readonly activeDescription: string;
  /** Label for the "More terminals..." item */
  readonly moreTerminalsLabel: string;
}

/** Discriminator for all terminal picker outcomes */
export type TerminalPickerOutcome = 'selected' | 'cancelled' | 'returned-to-destination-picker';

/**
 * Result of showing the terminal picker.
 */
export type TerminalPickerResult<T> =
  | { readonly outcome: Extract<TerminalPickerOutcome, 'selected'>; readonly result: T }
  | { readonly outcome: Extract<TerminalPickerOutcome, 'cancelled'> }
  | { readonly outcome: Extract<TerminalPickerOutcome, 'returned-to-destination-picker'> };

type TerminalPickerItem = TerminalBindableQuickPickItem | TerminalMoreQuickPickItem;

/**
 * Build QuickPick items for terminal selection.
 *
 * Reformats TerminalBindableQuickPickItem labels for the picker display
 * (plain names instead of icon-prefixed menu labels) while preserving
 * the rich terminalInfo for downstream use.
 */
const buildTerminalItems = (
  terminalItems: readonly TerminalBindableQuickPickItem[],
  options: TerminalPickerOptions,
  showAll: boolean,
): TerminalPickerItem[] => {
  const items: TerminalPickerItem[] = [];
  const maxItems = options.maxItemsBeforeMore;

  const itemsToShow =
    showAll || terminalItems.length <= maxItems ? terminalItems : terminalItems.slice(0, maxItems);

  for (const item of itemsToShow) {
    items.push({
      label: item.terminalInfo.name,
      description: item.terminalInfo.isActive ? options.activeDescription : undefined,
      displayName: item.terminalInfo.name,
      bindOptions: item.bindOptions,
      itemKind: 'bindable',
      isActive: item.isActive,
      terminalInfo: item.terminalInfo,
    });
  }

  if (!showAll && terminalItems.length > maxItems) {
    const remainingCount = terminalItems.length - maxItems;
    items.push({
      label: options.moreTerminalsLabel,
      displayName: options.moreTerminalsLabel,
      remainingCount,
      itemKind: 'terminal-more',
    });
  }

  return items;
};

/**
 * Show a QuickPick to select a terminal from a list of eligible terminals.
 *
 * This is a pure UI function - it only shows the picker. The caller is
 * responsible for deciding when to show the picker (e.g., handling the
 * 0 terminals or 1 terminal cases externally).
 *
 * Behavior:
 * - Shows QuickPick with all terminals (up to maxItemsBeforeMore)
 * - If more terminals than maxItemsBeforeMore, shows "More terminals..." item
 * - Selecting "More terminals..." opens secondary picker with all terminals
 * - Escaping secondary picker returns 'returned-to-destination-picker'
 *
 * @param terminalItems - Terminal items to show (must have at least 2)
 * @param vscodeAdapter - Adapter for VSCode API calls
 * @param options - Configuration for picker behavior and display strings
 * @param logger - Logger instance
 * @param onSelected - Callback invoked when a terminal is selected
 * @returns Result indicating selection outcome
 */
export const showTerminalPicker = async <T>(
  terminalItems: readonly TerminalBindableQuickPickItem[],
  vscodeAdapter: VscodeAdapter,
  options: TerminalPickerOptions,
  logger: Logger,
  onSelected: (terminal: EligibleTerminal) => T | Promise<T>,
): Promise<TerminalPickerResult<T>> => {
  const logCtx = { fn: 'showTerminalPicker', terminalCount: terminalItems.length };

  const items = buildTerminalItems(terminalItems, options, false);

  logger.debug({ ...logCtx, itemCount: items.length }, 'Showing terminal picker');

  const selected = await vscodeAdapter.showQuickPick(items, {
    title: options.title,
    placeHolder: options.placeholder,
  });

  if (!selected) {
    logger.debug(logCtx, 'User cancelled terminal picker');
    return { outcome: 'cancelled' };
  }

  switch (selected.itemKind) {
    case 'bindable':
      logger.debug({ fn: 'showTerminalPicker', selected }, 'Terminal selected');
      return {
        outcome: 'selected',
        result: await onSelected(selected.terminalInfo),
      };

    case 'terminal-more':
      logger.debug(logCtx, 'User selected "More terminals...", showing full list');
      return showSecondaryPicker(terminalItems, vscodeAdapter, logger, options, onSelected);

    default: {
      const _exhaustiveCheck: never = selected;
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.UNEXPECTED_ITEM_KIND,
        message: 'Unhandled item kind in terminal picker',
        functionName: 'showTerminalPicker',
        details: { selectedItem: _exhaustiveCheck },
      });
    }
  }
};

/**
 * Show secondary picker with all terminals.
 */
const showSecondaryPicker = async <T>(
  terminalItems: readonly TerminalBindableQuickPickItem[],
  vscodeAdapter: VscodeAdapter,
  logger: Logger,
  options: TerminalPickerOptions,
  onSelected: (terminal: EligibleTerminal) => T | Promise<T>,
): Promise<TerminalPickerResult<T>> => {
  const logCtx = { fn: 'showTerminalPicker.secondary', terminalCount: terminalItems.length };

  const items = buildTerminalItems(terminalItems, options, true);

  const selected = await vscodeAdapter.showQuickPick(items, {
    title: options.title,
    placeHolder: options.placeholder,
  });

  if (!selected) {
    logger.debug(logCtx, 'User escaped secondary picker, returning to destination picker');
    return { outcome: 'returned-to-destination-picker' };
  }

  switch (selected.itemKind) {
    case 'bindable':
      logger.debug(
        { fn: 'showTerminalPicker.secondary', selected },
        'Terminal selected from full list',
      );
      return {
        outcome: 'selected',
        result: await onSelected(selected.terminalInfo),
      };

    default:
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.UNEXPECTED_ITEM_KIND,
        message: 'Unexpected item kind in secondary terminal picker',
        functionName: 'showTerminalPicker.secondary',
        details: { selectedItem: selected },
      });
  }
};
