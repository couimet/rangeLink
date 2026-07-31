import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import { ExtensionResult } from '../types/ExtensionResult';

import type * as vscode from 'vscode';

export const validateTerminalDefined = (terminal: vscode.Terminal | undefined): ExtensionResult<vscode.Terminal> => {
  if (!terminal) {
    return ExtensionResult.err(
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Terminal reference is not defined',
        functionName: 'validateTerminalDefined',
      }),
    );
  }
  return ExtensionResult.ok(terminal);
};
