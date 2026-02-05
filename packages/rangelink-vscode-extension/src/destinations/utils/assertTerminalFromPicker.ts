import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import type { BindableQuickPickItem, TerminalBindOptions } from '../../types';

/**
 * Validates terminal reference exists in bindOptions and executes action.
 *
 * Centralizes the validation pattern used across terminal picker and status bar menu.
 * Throws with TERMINAL_ITEM_MISSING_REFERENCE if terminal is missing from bindOptions.
 *
 * @param selected - The selected QuickPick item with bindOptions
 * @param functionName - Function name for error context and logging
 * @param logger - Logger instance
 * @param logMessage - Message to log on successful validation
 * @param action - Lambda to execute with the validated terminal
 * @returns Result of the action lambda
 */
export const assertTerminalFromPicker = <T>(
  selected: BindableQuickPickItem,
  functionName: string,
  logger: Logger,
  logMessage: string,
  action: (terminal: vscode.Terminal) => T,
): T => {
  const terminalBindOptions = selected.bindOptions as TerminalBindOptions;
  if (!terminalBindOptions?.terminal) {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.TERMINAL_ITEM_MISSING_REFERENCE,
      message: 'Terminal item missing terminal reference in bindOptions',
      functionName,
      details: { selected },
    });
  }
  logger.debug({ fn: functionName, selected }, logMessage);
  return action(terminalBindOptions.terminal);
};
