import type { Logger, LoggingContext } from 'barebone-logger';

import { CHAT_PASTE_COMMANDS, FOCUS_TO_PASTE_DELAY_MS } from '../constants/chatPasteConstants';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

/**
 * Helper for automatic paste to AI chat destinations.
 *
 * Copies text to clipboard, waits for focus, then attempts paste using system commands.
 */
export class ChatPasteHelper {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Attempt automatic paste to focused chat interface.
   *
   * Strategy:
   * 1. Copy text to clipboard (avoid race conditions)
   * 2. Wait for focus to complete
   * 3. Try system paste commands in order until one succeeds
   *
   * @param text - Text to paste (copied to clipboard first)
   * @param contextInfo - Logging context with fn name and metadata
   * @returns true if paste succeeded, false if all commands failed
   */
  async attemptPaste(text: string, contextInfo: LoggingContext): Promise<boolean> {
    // Step 1: Copy to clipboard (ensures content is correct right before paste)
    await this.ideAdapter.writeTextToClipboard(text);
    this.logger.debug({ ...contextInfo, textLength: text.length }, 'Copied text to clipboard');

    // Step 2: Wait for focus to complete
    this.logger.debug(
      { ...contextInfo, delayMs: FOCUS_TO_PASTE_DELAY_MS },
      'Waiting for focus to complete before attempting paste',
    );
    await new Promise<void>((resolve) => global.setTimeout(resolve, FOCUS_TO_PASTE_DELAY_MS));

    // Step 3: Try paste commands in order until one succeeds
    for (const command of CHAT_PASTE_COMMANDS) {
      try {
        await this.ideAdapter.executeCommand(command);
        this.logger.info({ ...contextInfo, command }, 'Automatic paste succeeded');
        return true;
      } catch (pasteError) {
        this.logger.debug(
          { ...contextInfo, command, error: pasteError },
          'Paste command failed, trying next',
        );
      }
    }

    // All commands failed
    this.logger.info(
      { ...contextInfo, autoPaste: false },
      'All automatic paste commands failed - user will see manual paste instruction',
    );
    return false;
  }
}
