import type * as vscode from 'vscode';

import type { Logger, LoggingContext } from 'barebone-logger';
import { RangeLinkError, Result } from 'rangelink-core-ts';

import { BehaviourAfterPaste } from '../types';
import type { ClipboardService } from '../clipboard/ClipboardService';
import type { SendTextToTerminalOptions } from '../types';
import type { TerminalPasteAdapter } from '../ide/TerminalPasteAdapter';
import { VSCODE_CMD_TERMINAL_PASTE } from '../constants';
import { validateTerminalDefined } from '../utils';

/**
 * Clipboard-aware terminal paste orchestration.
 *
 * Writes content to clipboard (via ClipboardService), dispatches the
 * built-in paste command into the terminal, and optionally sends a
 * trailing Enter.  All the clipboard-gymnastics details are delegated
 * to ClipboardService so callers get a clean paste contract.
 */
export class TerminalPasteService {
  constructor(
    private readonly adapter: TerminalPasteAdapter,
    private readonly clipboardService: ClipboardService,
    private readonly logger: Logger,
  ) {}

  async pasteIntoTerminal(
    content: string,
    terminal: vscode.Terminal,
    options?: SendTextToTerminalOptions,
  ): Promise<Result<void, RangeLinkError>> {
    const logCtx: LoggingContext = { fn: 'TerminalPasteService.pasteIntoTerminal', terminalName: terminal?.name };

    const validationResult = validateTerminalDefined(terminal);
    if (!validationResult.success) {
      this.logger.error(
        { ...logCtx, error: validationResult.error },
        'Terminal paste failed - terminal not defined',
      );
      return validationResult as unknown as Result<void, RangeLinkError>;
    }

    const stageResult = await this.clipboardService.stage(content, async () => {
      terminal.show();
      await this.adapter.executeCommand(VSCODE_CMD_TERMINAL_PASTE);

      if (options?.behaviour === BehaviourAfterPaste.EXECUTE) {
        terminal.sendText('', true);
      }
    });

    if (!stageResult.success) {
      this.logger.error(
        { ...logCtx, error: stageResult.error },
        'Terminal paste failed - clipboard service problem',
      );
      return stageResult;
    }

    this.logger.info(logCtx, 'Terminal paste succeeded');
    return Result.ok(undefined);
  }
}
