import type { Logger } from 'barebone-logger';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import type { QuickPickProvider } from '../../ide/QuickPickProvider';
import type { FileBindableQuickPickItem } from '../../types';
import { MessageCode } from '../../types';
import { formatMessage } from '../../utils';
import type { FilePickerHandlers } from '../types';

import { buildFilePickerItems } from './buildFilePickerItems';

/**
 * Show a sectioned QuickPick to select a file from a list of eligible files.
 *
 * Items are organized into "Active Files" and per-tab-group sections via
 * buildFilePickerItems. The caller controls only what varies: selection action,
 * placeholder text, and dismiss behavior.
 *
 * @param fileItems - File items to show (from getAllFileItems())
 * @param quickPickProvider - Provider for VSCode QuickPick API
 * @param handlers - Callbacks for selection, dismiss, and placeholder
 * @param logger - Logger instance
 * @returns The handler's return value on selection, or undefined on dismiss (unless onDismissed is provided)
 * @throws RangeLinkExtensionError if fileItems is empty
 */
export const showFilePicker = async <T>(
  fileItems: readonly FileBindableQuickPickItem[],
  quickPickProvider: QuickPickProvider,
  handlers: FilePickerHandlers<T>,
  logger: Logger,
): Promise<T | undefined> => {
  if (fileItems.length === 0) {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.FILE_PICKER_EMPTY_ITEMS,
      message: 'showFilePicker called with no file items',
      functionName: 'showFilePicker',
    });
  }

  const logCtx = { fn: 'showFilePicker', fileCount: fileItems.length };

  const items = buildFilePickerItems(fileItems);

  logger.debug({ ...logCtx, itemCount: items.length }, 'Showing file picker');

  const selected = await quickPickProvider.showQuickPick(items, {
    title: formatMessage(MessageCode.FILE_PICKER_TITLE),
    placeHolder: handlers.getPlaceholder(),
  });

  if (!selected) {
    if (handlers.onDismissed) {
      return handlers.onDismissed();
    }
    logger.debug(logCtx, 'User cancelled file picker');
    return undefined;
  }

  if (!('fileInfo' in selected)) {
    // Unreachable at runtime — VSCode never returns separators as selections.
    // Required for TypeScript narrowing: buildFilePickerItems returns a union type.
    return undefined;
  }

  logger.debug({ fn: 'showFilePicker', selected }, 'File selected');
  return handlers.onSelected(selected.fileInfo);
};
