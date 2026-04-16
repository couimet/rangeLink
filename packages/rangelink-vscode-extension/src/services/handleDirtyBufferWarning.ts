import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { ConfigReader } from '../config/ConfigReader';
import { DEFAULT_WARN_ON_DIRTY_BUFFER, SETTING_WARN_ON_DIRTY_BUFFER } from '../constants';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { DirtyBufferWarningResult } from '../types';
import { formatMessage } from '../utils';

import type { DirtyBufferMessageCodes } from './types';

export type { DirtyBufferMessageCodes } from './types';
export { LINK_DIRTY_BUFFER_CODES, FILE_PATH_DIRTY_BUFFER_CODES } from './types';

/**
 * Checks whether a document has unsaved changes and, if so, shows the dirty
 * buffer warning dialog. Handles the full flow: isDirty check, setting check,
 * dialog interaction, and save.
 *
 * Returns a result indicating the document state or the user's choice.
 * When the document is clean, returns Clean (proceed without warning).
 * When the setting is disabled, returns ContinueAnyway with a debug log.
 *
 * @param document The document to check — caller ensures it is defined
 * @param configReader Config reader for the warnOnDirtyBuffer setting
 * @param ideAdapter Adapter for showing messages
 * @param logger Logger instance
 * @param messageCodes Message codes for the dialog labels
 * @returns Clean if no warning needed, or the user's dialog choice
 */
export const handleDirtyBufferWarning = async (
  document: vscode.TextDocument,
  configReader: ConfigReader,
  ideAdapter: VscodeAdapter,
  logger: Logger,
  messageCodes: DirtyBufferMessageCodes,
): Promise<DirtyBufferWarningResult> => {
  const fn = 'handleDirtyBufferWarning';

  if (!document.isDirty) {
    return DirtyBufferWarningResult.Clean;
  }

  const shouldWarnOnDirty = configReader.getBoolean(
    SETTING_WARN_ON_DIRTY_BUFFER,
    DEFAULT_WARN_ON_DIRTY_BUFFER,
  );

  if (!shouldWarnOnDirty) {
    logger.debug(
      { fn, documentUri: document.uri.toString() },
      'Document has unsaved changes but warning is disabled by setting',
    );
    return DirtyBufferWarningResult.ContinueAnyway;
  }

  logger.debug(
    { fn, documentUri: document.uri.toString() },
    'Document has unsaved changes, showing warning',
  );

  const warningMessage = formatMessage(messageCodes.warning);
  const saveLabel = formatMessage(messageCodes.save);
  const continueLabel = formatMessage(messageCodes.continueAnyway);

  const choice = await ideAdapter.showWarningMessage(warningMessage, saveLabel, continueLabel);

  const result: DirtyBufferWarningResult =
    choice === saveLabel
      ? DirtyBufferWarningResult.SaveAndContinue
      : choice === continueLabel
        ? DirtyBufferWarningResult.ContinueAnyway
        : DirtyBufferWarningResult.Dismissed;

  switch (result) {
    case DirtyBufferWarningResult.SaveAndContinue: {
      logger.debug({ fn }, 'User chose to save and generate');
      const saved = await document.save();
      if (!saved) {
        logger.warn({ fn }, 'Save operation failed or was cancelled');
        ideAdapter.showWarningMessage(formatMessage(messageCodes.saveFailed));
        return DirtyBufferWarningResult.SaveFailed;
      }
      logger.debug({ fn }, 'Document saved successfully');
      return result;
    }
    case DirtyBufferWarningResult.ContinueAnyway:
      logger.debug({ fn }, 'User chose to generate anyway');
      return result;
    case DirtyBufferWarningResult.Dismissed:
      logger.debug({ fn }, 'User dismissed warning, aborting');
      return result;
    default: {
      const exhaustiveCheck: never = result;
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
        message: `Unexpected dirty buffer warning result: ${exhaustiveCheck}`,
        functionName: 'handleDirtyBufferWarning',
        details: { exhaustiveCheck },
      });
    }
  }
};
