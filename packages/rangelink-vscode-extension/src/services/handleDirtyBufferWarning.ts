import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { DirtyBufferWarningResult, MessageCode } from '../types';
import { formatMessage } from '../utils';

/**
 * Shows the dirty buffer warning dialog and handles user response.
 *
 * @param document The document with unsaved changes
 * @param ideAdapter Adapter for showing messages
 * @param logger Logger instance
 * @returns The user's choice from the warning dialog
 */
export const handleDirtyBufferWarning = async (
  document: vscode.TextDocument,
  ideAdapter: VscodeAdapter,
  logger: Logger,
): Promise<DirtyBufferWarningResult> => {
  const fn = 'handleDirtyBufferWarning';
  const warningMessage = formatMessage(MessageCode.WARN_LINK_DIRTY_BUFFER);
  const saveAndGenerateLabel = formatMessage(MessageCode.WARN_LINK_DIRTY_BUFFER_SAVE);
  const generateAnywayLabel = formatMessage(MessageCode.WARN_LINK_DIRTY_BUFFER_CONTINUE);

  logger.debug(
    { fn, documentUri: document.uri.toString() },
    'Document has unsaved changes, showing warning',
  );

  const choice = await ideAdapter.showWarningMessage(
    warningMessage,
    saveAndGenerateLabel,
    generateAnywayLabel,
  );

  const result: DirtyBufferWarningResult =
    choice === saveAndGenerateLabel
      ? DirtyBufferWarningResult.SaveAndGenerate
      : choice === generateAnywayLabel
        ? DirtyBufferWarningResult.GenerateAnyway
        : DirtyBufferWarningResult.Dismissed;

  switch (result) {
    case DirtyBufferWarningResult.SaveAndGenerate: {
      logger.debug({ fn }, 'User chose to save and generate');
      const saved = await document.save();
      if (!saved) {
        logger.warn({ fn }, 'Save operation failed or was cancelled');
        ideAdapter.showWarningMessage(
          formatMessage(MessageCode.WARN_LINK_DIRTY_BUFFER_SAVE_FAILED),
        );
        return DirtyBufferWarningResult.SaveFailed;
      }
      logger.debug({ fn }, 'Document saved successfully');
      return result;
    }
    case DirtyBufferWarningResult.GenerateAnyway:
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
