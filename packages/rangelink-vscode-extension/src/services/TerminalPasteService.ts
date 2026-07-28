import type { Logger, LoggingContext } from '@couimet/logger-contract';
import type * as vscode from 'vscode';

import type { ClipboardService } from '../clipboard/ClipboardService';
import { VSCODE_CMD_TERMINAL_PASTE } from '../constants';
import type { TerminalPasteAdapter } from '../ide/TerminalPasteAdapter';
import { BehaviourAfterPaste } from '../types';
import type { SendTextToTerminalOptions } from '../types';
import { ExtensionResult } from '../types/ExtensionResult';
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
  ): Promise<ExtensionResult<void>> {
    const logCtx: LoggingContext = {
      fn: 'TerminalPasteService.pasteIntoTerminal',
      terminalName: terminal?.name,
    };

    const validationResult = validateTerminalDefined(terminal);
    if (!validationResult.success) {
      this.logger.error(
        { ...logCtx, error: validationResult.error },
        'Terminal paste failed - terminal not defined',
      );
      return validationResult as unknown as ExtensionResult<void>;
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
    return ExtensionResult.ok(undefined);
  }
}
