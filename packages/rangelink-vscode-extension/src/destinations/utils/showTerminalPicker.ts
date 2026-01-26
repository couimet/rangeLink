import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

/**
 * Options for configuring the terminal picker behavior and display.
 */
export interface TerminalPickerOptions {
  /** Maximum terminals to show before adding "More..." item */
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
export interface TerminalPickerResult {
  /** The selected terminal, or undefined if cancelled/no selection */
  readonly terminal: vscode.Terminal | undefined;
  /** True if user cancelled by pressing Escape */
  readonly cancelled: boolean;
  /** True if user escaped from "More terminals..." picker to return to destination picker */
  readonly returnedToDestinationPicker: boolean;
}

interface TerminalQuickPickItem extends vscode.QuickPickItem {
  readonly terminal?: vscode.Terminal;
  readonly isMoreItem?: boolean;
}

/**
 * Build QuickPick items for terminal selection.
 */
const buildTerminalItems = (
  terminals: readonly vscode.Terminal[],
  activeTerminal: vscode.Terminal | undefined,
  options: TerminalPickerOptions,
  showAll: boolean,
): TerminalQuickPickItem[] => {
  const items: TerminalQuickPickItem[] = [];
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
    });
  }

  if (!showAll && terminals.length > maxItems) {
    items.push({
      label: options.moreTerminalsLabel,
      description: options.formatMoreDescription(terminals.length - itemsBeforeMore),
      isMoreItem: true,
    });
  }

  return items;
};

/**
 * Show a QuickPick to select a terminal from available terminals.
 *
 * Behavior:
 * - 0 terminals: returns undefined terminal (not cancelled)
 * - 1 terminal: returns that terminal directly (no picker shown)
 * - 2-N terminals (N <= maxItemsBeforeMore): shows QuickPick with all terminals
 * - >N terminals: shows (N-1) terminals + "More terminals..." item
 *
 * The "More terminals..." item opens a secondary picker with all terminals.
 * Escaping the secondary picker returns `returnedToDestinationPicker: true`.
 *
 * @param vscodeAdapter - Adapter for VSCode API calls (provides terminals and activeTerminal)
 * @param options - Configuration for picker behavior and display strings
 * @param logger - Logger instance
 * @returns Result with selected terminal and status flags
 */
export const showTerminalPicker = async (
  vscodeAdapter: VscodeAdapter,
  options: TerminalPickerOptions,
  logger: Logger,
): Promise<TerminalPickerResult> => {
  const terminals = vscodeAdapter.terminals;
  const activeTerminal = vscodeAdapter.activeTerminal;
  const logCtx = { fn: 'showTerminalPicker', terminalCount: terminals.length };

  if (terminals.length === 0) {
    logger.debug(logCtx, 'No terminals available');
    return { terminal: undefined, cancelled: false, returnedToDestinationPicker: false };
  }

  if (terminals.length === 1) {
    logger.debug(logCtx, 'Single terminal available, returning directly');
    return { terminal: terminals[0], cancelled: false, returnedToDestinationPicker: false };
  }

  const items = buildTerminalItems(terminals, activeTerminal, options, false);

  logger.debug({ ...logCtx, itemCount: items.length }, 'Showing terminal picker');

  const selected = await vscodeAdapter.showQuickPick(items, {
    title: options.title,
    placeHolder: options.placeholder,
  });

  if (!selected) {
    logger.debug(logCtx, 'User cancelled terminal picker');
    return { terminal: undefined, cancelled: true, returnedToDestinationPicker: false };
  }

  if (selected.isMoreItem) {
    logger.debug(logCtx, 'User selected "More terminals...", showing full list');
    return showSecondaryPicker(terminals, activeTerminal, vscodeAdapter, logger, options);
  }

  logger.debug({ ...logCtx, selectedTerminal: selected.label }, 'Terminal selected');
  return { terminal: selected.terminal, cancelled: false, returnedToDestinationPicker: false };
};

/**
 * Show secondary picker with all terminals.
 */
const showSecondaryPicker = async (
  terminals: readonly vscode.Terminal[],
  activeTerminal: vscode.Terminal | undefined,
  vscodeAdapter: VscodeAdapter,
  logger: Logger,
  options: TerminalPickerOptions,
): Promise<TerminalPickerResult> => {
  const logCtx = { fn: 'showTerminalPicker.secondary', terminalCount: terminals.length };

  const items = buildTerminalItems(terminals, activeTerminal, options, true);

  const selected = await vscodeAdapter.showQuickPick(items, {
    title: options.title,
    placeHolder: options.placeholder,
  });

  if (!selected) {
    logger.debug(logCtx, 'User escaped secondary picker, returning to destination picker');
    return { terminal: undefined, cancelled: false, returnedToDestinationPicker: true };
  }

  logger.debug({ ...logCtx, selectedTerminal: selected.label }, 'Terminal selected from full list');
  return { terminal: selected.terminal, cancelled: false, returnedToDestinationPicker: false };
};
