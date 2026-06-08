import { Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';

export const validateTerminalDefined = (
  terminal: vscode.Terminal | undefined,
): Result<vscode.Terminal, RangeLinkExtensionError> => {
  if (!terminal) {
    return Result.err(
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
        message: 'Terminal reference is not defined',
        functionName: 'validateTerminalDefined',
      }),
    );
  }
  return Result.ok(terminal);
};
