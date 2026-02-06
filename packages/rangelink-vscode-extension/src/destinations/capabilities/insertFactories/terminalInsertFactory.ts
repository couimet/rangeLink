import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';

import type { InsertFactory } from './InsertFactory';

/**
 * InsertFactory for terminal destinations.
 *
 * Uses clipboard-based paste via pasteTextToTerminalViaClipboard.
 */
export class TerminalInsertFactory implements InsertFactory<vscode.Terminal> {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  forTarget(terminal: vscode.Terminal): (text: string) => Promise<boolean> {
    const terminalName = terminal.name;

    return async (text: string): Promise<boolean> => {
      const fn = 'TerminalInsertFactory.insert';
      try {
        await this.ideAdapter.pasteTextToTerminalViaClipboard(terminal, text);
        this.logger.info({ fn, terminalName }, 'Terminal paste succeeded');
        return true;
      } catch (error) {
        this.logger.warn({ fn, terminalName, error }, 'Terminal paste failed');
        return false;
      }
    };
  }
}
