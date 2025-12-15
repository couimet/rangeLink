import type { Logger, LoggingContext } from 'barebone-logger';

import { FOCUS_TO_PASTE_DELAY_MS } from '../../constants/chatPasteConstants';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import type { TextInserter } from './TextInserter';

/**
 * Inserts text via clipboard paste.
 *
 * Used by:
 * - Terminal: Avoids line wrapping issues with sendText()
 * - Claude Code: Clipboard + Cmd+V (no native API)
 * - Cursor AI: Clipboard + Cmd+V (no native API)
 */
export class ClipboardTextInserter implements TextInserter {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly pasteCommands: string[],
    private readonly beforePaste: (() => Promise<void>) | undefined,
    private readonly logger: Logger,
  ) {}

  async insert(text: string, context: LoggingContext): Promise<boolean> {
    // Copy to clipboard
    await this.ideAdapter.writeTextToClipboard(text);
    this.logger.debug({ ...context, textLength: text.length }, 'Copied text to clipboard');

    // Optional: Focus destination (e.g., show terminal)
    if (this.beforePaste) {
      await this.beforePaste();
    }

    // Wait for focus
    await new Promise<void>((resolve) => global.setTimeout(resolve, FOCUS_TO_PASTE_DELAY_MS));

    // Try paste commands in order
    for (const command of this.pasteCommands) {
      try {
        await this.ideAdapter.executeCommand(command);
        this.logger.info({ ...context, command }, 'Clipboard paste succeeded');
        return true;
      } catch (error) {
        this.logger.debug({ ...context, command, error }, 'Paste command failed, trying next');
      }
    }

    // All commands failed
    this.logger.info(
      { ...context, allCommandsFailed: true },
      'All clipboard paste commands failed',
    );
    return false;
  }
}
