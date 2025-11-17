import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * Cursor AI Assistant paste destination
 *
 * Pastes RangeLinks to Cursor's integrated AI chat interface.
 *
 * **LIMITATION:** Cursor does not support programmatically sending text to chat.
 * As of Jan 2025, no working command exists to send text parameters to Cursor chat:
 * - `workbench.action.chat.open` (VSCode) - NOT available in Cursor
 * - `aichat.newchataction` - Opens chat but cannot accept text parameters
 * - `cursor.startComposerPrompt` - Doesn't accept prompt arguments
 *
 * **Workaround:** Copy to clipboard + open chat panel + user pastes manually.
 *
 * **Detection strategy (Q3: appName primary):**
 * - Primary: Check vscode.env.appName for 'cursor'
 * - Secondary: Check for cursor-specific extensions
 * - Tertiary: Check vscode.env.uriScheme === 'cursor'
 *
 * **References:**
 * - Research: docs/RESEARCH-VSCODE-CURSOR-CHAT-COMMANDS.md
 * - Forum: https://forum.cursor.com/t/a-command-for-passing-a-prompt-to-the-chat/138049
 * - Questions: .claude-questions/0019-cursor-ai-destination-implementation.txt
 */
export class CursorAIDestination implements PasteDestination {
  readonly id: DestinationType = 'cursor-ai';
  readonly displayName = 'Cursor AI Assistant';

  // Commands to try opening chat panel (in order of preference)
  private static readonly CHAT_COMMANDS = [
    'aichat.newchataction', // Primary: Cursor-specific command (Cmd+L / Ctrl+L)
    'workbench.action.toggleAuxiliaryBar', // Fallback: Toggle secondary sidebar
  ];

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if running in Cursor IDE
   *
   * Uses multiple detection methods (Q8 from 0018: use all 3, OR logic):
   * 1. appName check (primary per Q3)
   * 2. Cursor-specific extensions check
   * 3. URI scheme check
   *
   * Logs each detection method result (Q10: Option A).
   *
   * @returns true if Cursor IDE detected, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    // Method 1: Check app name (PRIMARY per Q3: Option A)
    const appName = this.ideAdapter.appName.toLowerCase();
    const appNameMatch = appName.includes('cursor');
    this.logger.debug(
      { fn: 'CursorAIDestination.isAvailable', method: 'appName', appName, detected: appNameMatch },
      appNameMatch ? 'Cursor detected via appName' : 'Cursor not detected via appName',
    );

    if (appNameMatch) {
      return true;
    }

    // Method 2: Check for Cursor-specific extensions
    const cursorExtensions = this.ideAdapter.extensions.filter((ext) =>
      ext.id.startsWith('cursor.'),
    );
    const hasExtensions = cursorExtensions.length > 0;
    this.logger.debug(
      {
        fn: 'CursorAIDestination.isAvailable',
        method: 'extensions',
        extensionCount: cursorExtensions.length,
        detected: hasExtensions,
      },
      hasExtensions
        ? `Cursor detected via extensions (found ${cursorExtensions.length})`
        : 'Cursor not detected via extensions',
    );

    if (hasExtensions) {
      return true;
    }

    // Method 3: Check URI scheme
    const uriScheme = this.ideAdapter.uriScheme;
    const schemeMatch = uriScheme === 'cursor';
    this.logger.debug(
      {
        fn: 'CursorAIDestination.isAvailable',
        method: 'uriScheme',
        uriScheme,
        detected: schemeMatch,
      },
      schemeMatch ? 'Cursor detected via uriScheme' : 'Cursor not detected via uriScheme',
    );

    if (schemeMatch) {
      return true;
    }

    // None of the methods detected Cursor
    this.logger.debug(
      { fn: 'CursorAIDestination.isAvailable', detected: false },
      'Cursor IDE not detected by any method',
    );

    return false;
  }

  /**
   * Check if a RangeLink is eligible to be pasted to Cursor AI
   *
   * Cursor AI has no special eligibility rules - always eligible.
   *
   * @param _formattedLink - The formatted RangeLink (not used)
   * @returns Always true (Cursor AI accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteLink(_formattedLink: FormattedLink): Promise<boolean> {
    return true;
  }

  /**
   * Check if text content is eligible to be pasted to Cursor AI

  /**
   * Paste a RangeLink to Cursor AI chat
   *
   * **Implementation:** Since Cursor doesn't support programmatic text insertion,
   * this method opens Cursor chat interface. The caller (RangeLinkService) handles
   * clipboard copy and user notification.
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns true if chat open succeeded, false otherwise
   */
  async pasteLink(formattedLink: FormattedLink): Promise<boolean> {
    return this.openChatInterface({
      fn: 'CursorAIDestination.pasteLink',
      formattedLink,
      linkLength: formattedLink.link.length,
    });
  }

  /**
   * Open Cursor chat interface with fallback command attempts
   *
   * Tries multiple commands in order of preference until one succeeds.
   * Shared logic extracted from pasteLink() and pasteContent() to eliminate duplication.
   *
   * @param contextInfo - Logging context with fn name and content metadata
   * @returns true if chat open succeeded or commands attempted, false if not in Cursor IDE
   */
  private async openChatInterface(contextInfo: LoggingContext): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn(contextInfo, 'Cannot paste: Not running in Cursor IDE');
      return false;
    }

    try {
      // Try opening chat panel with multiple fallback commands
      let chatOpened = false;
      for (const command of CursorAIDestination.CHAT_COMMANDS) {
        try {
          await this.ideAdapter.executeCommand(command);
          this.logger.debug({ ...contextInfo, command }, 'Successfully executed chat open command');
          chatOpened = true;
          break;
        } catch (commandError) {
          this.logger.debug(
            { ...contextInfo, command, error: commandError },
            'Command failed, trying next fallback',
          );
        }
      }

      if (!chatOpened) {
        this.logger.warn(contextInfo, 'All chat open commands failed');
      }

      this.logger.info({ ...contextInfo, chatOpened }, 'Cursor chat open completed');

      return true;
    } catch (error) {
      this.logger.error({ ...contextInfo, error }, 'Failed to open Cursor chat');
      return false;
    }
  }

  /**
   * Check if text content is eligible to be pasted to Cursor AI
   *
   * Cursor AI has no special eligibility rules - always eligible.
   *
   * @param _content - The text content (not used)
   * @returns Always true (Cursor AI accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteContent(_content: string): Promise<boolean> {
    return true;
  }

  /**
   * Paste text content to Cursor AI chat
   *
   * Similar to pasteLink() but accepts raw text content instead of FormattedLink.
   * Used for pasting selected text directly to Cursor AI (issue #89).
   *
   * **Implementation:** Since Cursor doesn't support programmatic text insertion,
   * this method opens Cursor chat interface. The caller (RangeLinkService) handles
   * clipboard copy and user notification.
   *
   * @param content - The text content to paste
   * @returns true if chat open succeeded, false otherwise
   */
  async pasteContent(content: string): Promise<boolean> {
    return this.openChatInterface({
      fn: 'CursorAIDestination.pasteContent',
      contentLength: content.length,
    });
  }

  /**
   * Get user instruction for manual paste (clipboard-based destination)
   *
   * @returns Instruction string for manual paste in Cursor AI chat
   */
  getUserInstruction(): string | undefined {
    return formatMessage(MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS);
  }

  /**
   * Focus Cursor AI chat interface
   *
   * Opens/focuses the Cursor AI chat panel to bring it into view.
   * Reuses the same command sequence as pasteLink().
   *
   * Used by the "Jump to Bound Destination" command (issue #99).
   *
   * @returns true if chat focus succeeded, false otherwise
   */
  async focus(): Promise<boolean> {
    return this.openChatInterface({
      fn: 'CursorAIDestination.focus',
    });
  }

  /**
   * Get success message for jump command
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI);
  }

  /**
   * Get destination-specific details for logging
   *
   * Cursor AI destinations have no additional details to log beyond displayName.
   *
   * @returns Empty object (no additional details)
   */
  getLoggingDetails(): Record<string, unknown> {
    return {};
  }
}
