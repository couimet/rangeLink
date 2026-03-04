import type { Logger } from 'barebone-logger';

import type { ConfigReader } from '../config/ConfigReader';
import { DEFAULT_CLIPBOARD_PRESERVE } from '../constants/settingDefaults';
import { SETTING_CLIPBOARD_PRESERVE } from '../constants/settingKeys';
import type { ClipboardProvider } from '../ide/ClipboardProvider';

/**
 * Wraps an async operation with clipboard save/restore when preservation is enabled.
 *
 * Reads the rangelink.clipboard.preserve setting to determine behaviour:
 * - 'always': saves clipboard before fn, restores in finally block
 * - 'never': calls fn directly with no clipboard interaction
 *
 * If the clipboard read fails, fn is still executed but restoration is skipped —
 * there is no saved content to restore.
 *
 * Note: `return await fn()` in the try block is intentional — without await,
 * the finally (clipboard restore) would run before fn() resolves.
 */
export const withClipboardPreservation = async <T>(
  clipboard: ClipboardProvider,
  configReader: ConfigReader,
  logger: Logger,
  fn: () => Promise<T>,
): Promise<T> => {
  const mode = configReader.getWithDefault(SETTING_CLIPBOARD_PRESERVE, DEFAULT_CLIPBOARD_PRESERVE);

  if (mode === 'never') {
    return fn();
  }

  let saved: string;
  try {
    saved = await clipboard.readTextFromClipboard();
  } catch (error) {
    logger.error({ fn: 'withClipboardPreservation', error }, 'Clipboard read failed — skipping preservation');
    return fn();
  }

  try {
    return await fn();
  } finally {
    try {
      await clipboard.writeTextToClipboard(saved);
      logger.debug({ fn: 'withClipboardPreservation' }, 'Clipboard restored');
    } catch (error) {
      logger.error({ fn: 'withClipboardPreservation', error }, 'Clipboard restoration failed');
    }
  }
};
