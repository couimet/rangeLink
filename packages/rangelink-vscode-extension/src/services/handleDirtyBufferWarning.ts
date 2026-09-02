import type { ConfigReader } from '../config/ConfigReader';
import { DEFAULT_UNSAVED_FILE_ACTION, SETTING_UNSAVED_FILE_ACTION } from '../constants';
import { RangeLinkExtensionError } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { DirtyBufferWarningResult, MessageCode, type UnsavedFileAction } from '../types';
import { formatMessage } from '../utils';

import type { DirtyBufferMessageCodes } from './types';

import type { Logger } from '@couimet/logger-contract';
import type * as vscode from 'vscode';

/**
 * Saves the document before a dirty-buffer flow continues, mapping a failed or
 * cancelled save to SaveFailed (with a warning toast) instead of proceeding.
 * Shared by the auto-save and modal "Save & Generate" paths.
 */
const saveAndContinue = async (
  document: vscode.TextDocument,
  ideAdapter: VscodeAdapter,
  messageCodes: DirtyBufferMessageCodes,
  logger: Logger,
): Promise<DirtyBufferWarningResult> => {
  const fn = 'handleDirtyBufferWarning.saveAndContinue';
  logger.debug({ fn }, 'Saving document before continuing');
  const saved = await document.save();
  if (!saved) {
    logger.warn({ fn }, 'Save operation failed or was cancelled');
    void ideAdapter.showWarningMessage(formatMessage(messageCodes.saveFailed));
    return DirtyBufferWarningResult.SaveFailed;
  }
  logger.debug({ fn }, 'Document saved successfully');
  return DirtyBufferWarningResult.SaveAndContinue;
};

/**
 * Checks whether a document has unsaved changes and, if so, acts according to
 * the rangelink.unsavedFile.action setting: prompts with a modal dialog,
 * auto-saves, or continues without saving.
 *
 * Returns a result indicating the document state or the action taken.
 * When the document is clean, returns Clean (proceed without warning).
 *
 * @param document The document to check — caller ensures it is defined
 * @param configReader Config reader for the unsavedFile.action setting
 * @param ideAdapter Adapter for showing messages
 * @param logger Logger instance
 * @param messageCodes Message codes for the dialog labels
 * @returns Clean if no warning needed, or the action taken
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

  const unsavedFileAction = configReader.getWithDefault<UnsavedFileAction>(SETTING_UNSAVED_FILE_ACTION, DEFAULT_UNSAVED_FILE_ACTION);

  if (unsavedFileAction === 'continueAnyway') {
    logger.debug({ fn, documentUri: document.uri.toString() }, 'Document has unsaved changes but unsavedFile.action=continueAnyway bypasses the dialog');
    return DirtyBufferWarningResult.ContinueAnyway;
  }

  if (unsavedFileAction === 'saveAndContinue') {
    logger.debug({ fn, documentUri: document.uri.toString() }, 'Document has unsaved changes, unsavedFile.action=saveAndContinue auto-saving');
    return saveAndContinue(document, ideAdapter, messageCodes, logger);
  }

  logger.debug({ fn, documentUri: document.uri.toString() }, 'Document has unsaved changes, showing modal warning');

  const warningMessage = formatMessage(messageCodes.warning);
  const saveLabel = formatMessage(messageCodes.save);
  const continueLabel = formatMessage(messageCodes.continueAnyway);

  const choice = await ideAdapter.showWarningMessageWithOptions(warningMessage, { modal: true }, saveLabel, continueLabel);

  const result: DirtyBufferWarningResult =
    choice === saveLabel
      ? DirtyBufferWarningResult.SaveAndContinue
      : choice === continueLabel
        ? DirtyBufferWarningResult.ContinueAnyway
        : DirtyBufferWarningResult.Dismissed;

  switch (result) {
    case DirtyBufferWarningResult.SaveAndContinue: {
      logger.debug({ fn }, 'User chose to save and continue');
      return saveAndContinue(document, ideAdapter, messageCodes, logger);
    }
    case DirtyBufferWarningResult.ContinueAnyway:
      logger.debug({ fn }, 'User chose to continue without saving');
      return result;
    case DirtyBufferWarningResult.Dismissed:
      logger.debug({ fn }, 'User dismissed warning, aborting');
      void ideAdapter.showInformationMessage(formatMessage(MessageCode.INFO_OPERATION_ABORTED_DIRTY_BUFFER));
      return result;
    default:
      throw RangeLinkExtensionError.forUnexpectedSwitchDefault('dirty buffer warning result', result, 'handleDirtyBufferWarning');
  }
};
