import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { FocusErrorReason, type FocusResult, type PasteExecutor } from './PasteExecutor';

/**
 * PasteExecutor for terminal destinations.
 *
 * Uses clipboard-based paste (pasteTextToTerminalViaClipboard) to insert text.
 */
export class TerminalPasteExecutor implements PasteExecutor {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly terminal: vscode.Terminal,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    try {
      this.terminal.show(true);

      this.logger.debug(
        { ...context, terminalName: this.terminal.name },
        'Terminal focused via show()',
      );

      return Result.ok({
        insert: this.createInsertFunction(),
      });
    } catch (error) {
      this.logger.warn(
        { ...context, terminalName: this.terminal.name, error },
        'Failed to focus terminal',
      );
      return Result.err({
        reason: FocusErrorReason.TERMINAL_FOCUS_FAILED,
        cause: error,
      });
    }
  }

  private createInsertFunction(): (text: string, context: LoggingContext) => Promise<boolean> {
    return async (text: string, context: LoggingContext): Promise<boolean> => {
      try {
        await this.ideAdapter.pasteTextToTerminalViaClipboard(this.terminal, text);
        this.logger.info(
          { ...context, terminalName: this.terminal.name },
          'Terminal clipboard paste succeeded',
        );
        return true;
      } catch (error) {
        this.logger.warn(
          { ...context, terminalName: this.terminal.name, error },
          'Terminal clipboard paste threw exception',
        );
        return false;
      }
    };
  }
}
