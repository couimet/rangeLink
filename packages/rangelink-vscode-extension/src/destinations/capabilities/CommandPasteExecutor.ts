import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';

import { FOCUS_TO_PASTE_DELAY_MS } from '../../constants/chatPasteConstants';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { FocusErrorReason, type FocusResult, type PasteExecutor } from './PasteExecutor';

/**
 * PasteExecutor for command-based destinations.
 *
 * Combines focus and insert operations via VSCode commands:
 * 1. focus() executes focus commands and returns insert closure
 * 2. insert() copies text to clipboard and executes paste commands
 *
 * Used by: Claude Code, Cursor AI, GitHub Copilot Chat
 */
export class CommandPasteExecutor implements PasteExecutor {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly focusCommands: string[],
    private readonly pasteCommands: string[],
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    for (const command of this.focusCommands) {
      try {
        await this.ideAdapter.executeCommand(command);
        this.logger.debug({ ...context, command }, 'Focus command succeeded');

        return Result.ok({
          insert: this.createInsertFunction(),
        });
      } catch (error) {
        this.logger.debug({ ...context, command, error }, 'Focus command failed, trying next');
      }
    }

    this.logger.warn({ ...context, allCommandsFailed: true }, 'All focus commands failed');
    return Result.err({
      reason: FocusErrorReason.COMMAND_FOCUS_FAILED,
    });
  }

  private createInsertFunction(): (text: string, context: LoggingContext) => Promise<boolean> {
    return async (text: string, context: LoggingContext): Promise<boolean> => {
      await this.ideAdapter.writeTextToClipboard(text);
      this.logger.debug({ ...context, textLength: text.length }, 'Copied text to clipboard');

      await new Promise<void>((resolve) => global.setTimeout(resolve, FOCUS_TO_PASTE_DELAY_MS));

      for (const command of this.pasteCommands) {
        try {
          await this.ideAdapter.executeCommand(command);
          this.logger.info({ ...context, command }, 'Clipboard paste succeeded');
          return true;
        } catch (error) {
          this.logger.debug({ ...context, command, error }, 'Paste command failed, trying next');
        }
      }

      this.logger.info(
        { ...context, allCommandsFailed: true },
        'All clipboard paste commands failed',
      );
      return false;
    };
  }
}
