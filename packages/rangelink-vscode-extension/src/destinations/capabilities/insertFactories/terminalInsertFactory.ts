import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';

import type { InsertFactory } from './InsertFactory';

/**
 * InsertFactory for terminal destinations.
 *
 * Shows the terminal and executes the terminal paste command. The clipboard is
 * populated once by ClipboardRouter.executeCopyAndSend() before this factory
 * is invoked.
 */
export class TerminalInsertFactory implements InsertFactory<vscode.Terminal> {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  forTarget(terminal: vscode.Terminal): (text: string) => Promise<boolean> {
    const terminalName = terminal.name;

    return async (_text: string): Promise<boolean> => {
      const logCtx = { fn: 'TerminalInsertFactory.insert', terminalName };
      try {
        await this.ideAdapter.pasteIntoTerminal(terminal);
        this.logger.info(logCtx, 'Terminal paste succeeded');
        return true;
      } catch (error) {
        this.logger.error({ ...logCtx, error }, 'Terminal paste failed');
        return false;
      }
    };
  }
}
