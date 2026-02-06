import type { Logger } from 'barebone-logger';

import { FOCUS_TO_PASTE_DELAY_MS } from '../../../constants/chatPasteConstants';
import type { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';

import type { InsertFactory } from './InsertFactory';

/**
 * InsertFactory for AI assistant destinations.
 *
 * AI assistants (Claude Code, Cursor AI, GitHub Copilot Chat) use clipboard-based
 * paste via VSCode commands. Unlike terminal/editor destinations, there's no
 * runtime target - the paste commands are fixed at factory creation time.
 */
export class AIAssistantInsertFactory implements InsertFactory<void> {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly pasteCommands: readonly string[],
    private readonly logger: Logger,
  ) {}

  forTarget(): (text: string) => Promise<boolean> {
    return async (text: string): Promise<boolean> => {
      const fn = 'AIAssistantInsertFactory.insert';
      await this.ideAdapter.writeTextToClipboard(text);
      this.logger.debug({ fn, textLength: text.length }, 'Copied text to clipboard');

      await new Promise<void>((resolve) => setTimeout(resolve, FOCUS_TO_PASTE_DELAY_MS));

      for (const command of this.pasteCommands) {
        try {
          await this.ideAdapter.executeCommand(command);
          this.logger.info({ fn, command }, 'Clipboard paste succeeded');
          return true;
        } catch (error) {
          this.logger.debug({ fn, command, error }, 'Paste command failed, trying next');
        }
      }

      this.logger.info({ fn, allCommandsFailed: true }, 'All clipboard paste commands failed');
      return false;
    };
  }
}
