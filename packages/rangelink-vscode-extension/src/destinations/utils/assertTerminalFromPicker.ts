import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';

/**
 * Validates terminal reference exists on picker item and executes action.
 *
 * Centralizes the validation pattern used across terminal picker and status bar menu.
 * Throws with TERMINAL_ITEM_MISSING_REFERENCE if terminal is missing.
 *
 * @param selected - The selected QuickPick item
 * @param functionName - Function name for error context and logging
 * @param logger - Logger instance
 * @param logMessage - Message to log on successful validation
 * @param action - Lambda to execute with the validated terminal
 * @returns Result of the action lambda
 */
export const assertTerminalFromPicker = <T>(
  selected: Pick<vscode.QuickPickItem, 'label'> & { readonly terminal?: vscode.Terminal },
  functionName: string,
  logger: Logger,
  logMessage: string,
  action: (terminal: vscode.Terminal) => T,
): T => {
  if (!selected.terminal) {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.TERMINAL_ITEM_MISSING_REFERENCE,
      message: 'Terminal item missing terminal reference',
      functionName,
      details: { selected },
    });
  }
  logger.debug({ fn: functionName, selected }, logMessage);
  return action(selected.terminal);
};
