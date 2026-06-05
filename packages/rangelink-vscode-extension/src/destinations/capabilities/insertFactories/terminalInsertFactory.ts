import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { TerminalPasteService } from '../../../services';

import type { InsertFactory } from './InsertFactory';

/**
 * InsertFactory for terminal destinations.
 */
export class TerminalInsertFactory implements InsertFactory<vscode.Terminal> {
  constructor(
    private readonly terminalPasteService: TerminalPasteService,
    private readonly logger: Logger,
  ) {}

  forTarget(terminal: vscode.Terminal): (text: string) => Promise<boolean> {
    const terminalName = terminal.name;

    return async (text: string): Promise<boolean> => {
      const logCtx = { fn: 'TerminalInsertFactory.insert', terminalName };

      const result = await this.terminalPasteService.pasteIntoTerminal(text, terminal);
      if (!result.success) {
        this.logger.error({ ...logCtx, error: result.error }, 'Terminal paste failed');
        return false;
      }
      this.logger.info(logCtx, 'Terminal paste succeeded');
      return true;
    };
  }
}
