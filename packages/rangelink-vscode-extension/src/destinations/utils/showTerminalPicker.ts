import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { TerminalMoreQuickPickItem, TerminalQuickPickItem } from '../../types';

import { assertTerminalFromPicker } from './assertTerminalFromPicker';

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
  /** Function to format the "More..." item description (receives remaining count) */
  readonly formatMoreDescription: (remainingCount: number) => string;
}

/**
 * Result of showing the terminal picker.
 */
export type TerminalPickerResult<T> =
  | { readonly outcome: 'selected'; readonly result: T }
  | { readonly outcome: 'cancelled' }
  | { readonly outcome: 'returned-to-destination-picker' };

type TerminalPickerQuickPickItem = TerminalQuickPickItem | TerminalMoreQuickPickItem;

/**
 * Build QuickPick items for terminal selection.
 */
const buildTerminalItems = (
  terminals: readonly vscode.Terminal[],
  activeTerminal: vscode.Terminal | undefined,
  options: TerminalPickerOptions,
  showAll: boolean,
): TerminalPickerQuickPickItem[] => {
  const items: TerminalPickerQuickPickItem[] = [];
  const maxItems = options.maxItemsBeforeMore;
  const itemsBeforeMore = maxItems - 1;

  const terminalsToShow =
    showAll || terminals.length <= maxItems ? terminals : terminals.slice(0, itemsBeforeMore);

  for (const terminal of terminalsToShow) {
    const isActive = terminal === activeTerminal;
    items.push({
      label: terminal.name,
      description: isActive ? options.activeDescription : undefined,
      terminal,
      itemKind: 'terminal',
    });
  }

  if (!showAll && terminals.length > maxItems) {
    const remainingCount = terminals.length - itemsBeforeMore;
    items.push({
      label: options.moreTerminalsLabel,
      displayName: options.moreTerminalsLabel,
      remainingCount,
      description: options.formatMoreDescription(remainingCount),
      itemKind: 'terminal-more',
    });
  }

  return items;
};

/**
 * Show a QuickPick to select a terminal from a list of terminals.
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
 * @param terminals - The terminals to show in the picker (must have at least 2)
 * @param activeTerminal - The currently active terminal (shown with special description)
 * @param vscodeAdapter - Adapter for VSCode API calls
 * @param options - Configuration for picker behavior and display strings
 * @param logger - Logger instance
 * @param onSelected - Callback invoked when a terminal is selected
 * @returns Result indicating selection outcome
 */
export const showTerminalPicker = async <T>(
  terminals: readonly vscode.Terminal[],
  activeTerminal: vscode.Terminal | undefined,
  vscodeAdapter: VscodeAdapter,
  options: TerminalPickerOptions,
  logger: Logger,
  onSelected: (terminal: vscode.Terminal) => T | Promise<T>,
): Promise<TerminalPickerResult<T>> => {
  const logCtx = { fn: 'showTerminalPicker', terminalCount: terminals.length };

  const items = buildTerminalItems(terminals, activeTerminal, options, false);

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
    case 'terminal':
      return assertTerminalFromPicker(
        selected,
        'showTerminalPicker',
        logger,
        'Terminal selected',
        async (terminal) => ({ outcome: 'selected' as const, result: await onSelected(terminal) }),
      );

    case 'terminal-more':
      logger.debug(logCtx, 'User selected "More terminals...", showing full list');
      return showSecondaryPicker(terminals, activeTerminal, vscodeAdapter, logger, options, onSelected);

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
  terminals: readonly vscode.Terminal[],
  activeTerminal: vscode.Terminal | undefined,
  vscodeAdapter: VscodeAdapter,
  logger: Logger,
  options: TerminalPickerOptions,
  onSelected: (terminal: vscode.Terminal) => T | Promise<T>,
): Promise<TerminalPickerResult<T>> => {
  const logCtx = { fn: 'showTerminalPicker.secondary', terminalCount: terminals.length };

  const items = buildTerminalItems(terminals, activeTerminal, options, true);

  const selected = await vscodeAdapter.showQuickPick(items, {
    title: options.title,
    placeHolder: options.placeholder,
  });

  if (!selected) {
    logger.debug(logCtx, 'User escaped secondary picker, returning to destination picker');
    return { outcome: 'returned-to-destination-picker' };
  }

  switch (selected.itemKind) {
    case 'terminal':
      return assertTerminalFromPicker(
        selected,
        'showTerminalPicker.secondary',
        logger,
        'Terminal selected from full list',
        async (terminal) => ({ outcome: 'selected' as const, result: await onSelected(terminal) }),
      );

    default:
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.UNEXPECTED_ITEM_KIND,
        message: 'Unexpected item kind in secondary terminal picker',
        functionName: 'showTerminalPicker.secondary',
        details: { selectedItem: selected },
      });
  }
};
