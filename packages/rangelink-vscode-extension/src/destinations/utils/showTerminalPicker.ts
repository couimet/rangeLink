import type { Logger } from 'barebone-logger';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import type { QuickPickProvider } from '../../ide/QuickPickProvider';
import type { TerminalBindableQuickPickItem } from '../../types';
import { MessageCode } from '../../types';
import { formatMessage } from '../../utils';
import type { TerminalPickerHandlers } from '../types';

import { buildTerminalPickerItems } from './buildTerminalPickerItems';

/**
 * Show a QuickPick to select a terminal from a list of eligible terminals.
 *
 * This is a flat-list picker — title and active descriptions are built internally
 * from shared MessageCode constants. The caller controls only what varies:
 * selection action, placeholder text, and dismiss behavior.
 *
 * @param terminalItems - Terminal items to show
 * @param quickPickProvider - Provider for VSCode QuickPick API
 * @param handlers - Callbacks for selection, dismiss, and placeholder
 * @param logger - Logger instance
 * @returns The handler's return value on selection, or undefined on dismiss (unless onDismissed is provided)
 * @throws RangeLinkExtensionError if terminalItems is empty
 */
export const showTerminalPicker = async <T>(
  terminalItems: readonly TerminalBindableQuickPickItem[],
  quickPickProvider: QuickPickProvider,
  handlers: TerminalPickerHandlers<T>,
  logger: Logger,
): Promise<T | undefined> => {
  if (terminalItems.length === 0) {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.TERMINAL_PICKER_EMPTY_ITEMS,
      message: 'showTerminalPicker called with no terminal items',
      functionName: 'showTerminalPicker',
    });
  }

  const logCtx = { fn: 'showTerminalPicker', terminalCount: terminalItems.length };

  const items = buildTerminalPickerItems(terminalItems, (terminal) => terminal.name);

  logger.debug({ ...logCtx, itemCount: items.length }, 'Showing terminal picker');

  const selected = await quickPickProvider.showQuickPick(items, {
    title: formatMessage(MessageCode.TERMINAL_PICKER_TITLE),
    placeHolder: handlers.getPlaceholder(),
  });

  if (!selected) {
    if (handlers.onDismissed) {
      return handlers.onDismissed();
    }
    logger.debug(logCtx, 'User cancelled terminal picker');
    return undefined;
  }

  logger.debug({ fn: 'showTerminalPicker', selected }, 'Terminal selected');
  return handlers.onSelected(selected.terminalInfo);
};
