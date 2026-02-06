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

      // Must overwrite clipboard with padded text — RangeLinkService wrote the
      // unpadded original, but smart padding was applied after that clipboard write.
      // AI assistant paste commands read from clipboard, so it must contain the final text.
      try {
        await this.ideAdapter.writeTextToClipboard(text);
      } catch (error) {
        this.logger.warn({ fn, error }, 'Failed to write to clipboard');
        return false;
      }
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
