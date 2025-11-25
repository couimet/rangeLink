import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

import type { ChatPasteHelperFactory } from './ChatPasteHelperFactory';
import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * Cursor AI Assistant paste destination.
 *
 * Automatically pastes RangeLinks to Cursor's integrated AI chat interface.
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
    private readonly chatPasteHelperFactory: ChatPasteHelperFactory,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if running in Cursor IDE.
   *
   * Uses multiple detection methods:
   * 1. appName check (primary)
   * 2. Cursor-specific extensions check
   * 3. URI scheme check
   *
   * @returns true if Cursor IDE detected, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    // Method 1: Check app name (PRIMARY)
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
   * Check if a RangeLink is eligible to be pasted to Cursor AI.
   *
   * @param _formattedLink - The formatted RangeLink (not used)
   * @returns Always true (Cursor AI accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteLink(_formattedLink: FormattedLink): Promise<boolean> {
    return true;
  }

  /**
   * Try focus commands until one succeeds.
   *
   * @param contextInfo - Logging context with fn name and content metadata
   * @returns true if any command succeeded, false if all failed
   */
  private async tryFocusCommands(contextInfo: LoggingContext): Promise<boolean> {
    for (const command of CursorAIDestination.CHAT_COMMANDS) {
      try {
        await this.ideAdapter.executeCommand(command);
        this.logger.debug({ ...contextInfo, command }, 'Successfully executed command');
        return true;
      } catch (error) {
        this.logger.debug(
          { ...contextInfo, command, error },
          'Command failed, trying next fallback',
        );
      }
    }
    return false;
  }

  /**
   * Paste a RangeLink to Cursor AI chat.
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns true if paste succeeded, false otherwise
   */
  async pasteLink(formattedLink: FormattedLink): Promise<boolean> {
    return this.openChatInterfaceAndPaste(formattedLink.link, {
      fn: 'CursorAIDestination.pasteLink',
      formattedLink,
      linkLength: formattedLink.link.length,
    });
  }

  /**
   * Open Cursor chat interface and attempt automatic paste.
   *
   * @param text - Text to paste
   * @param contextInfo - Logging context with fn name and content metadata
   * @returns true if chat open succeeded or commands attempted, false if not in Cursor IDE
   */
  private async openChatInterfaceAndPaste(
    text: string,
    contextInfo: LoggingContext,
  ): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn(contextInfo, 'Cannot paste: Not running in Cursor IDE');
      return false;
    }

    try {
      // Step 1: Try opening/focusing Cursor chat with multiple fallback commands
      const chatOpened = await this.tryFocusCommands(contextInfo);

      if (!chatOpened) {
        this.logger.warn(contextInfo, 'All chat open commands failed');
        return true; // Still return true - caller will show manual paste instruction
      }

      // Step 2: Attempt automatic paste using ChatPasteHelper
      const chatPasteHelper = this.chatPasteHelperFactory.create();
      const pasteSucceeded = await chatPasteHelper.attemptPaste(text, contextInfo);

      this.logger.info(
        { ...contextInfo, chatOpened, pasteSucceeded },
        'Cursor chat open completed',
      );

      return true; // Return true regardless of paste success - caller handles manual instruction
    } catch (error) {
      this.logger.error({ ...contextInfo, error }, 'Failed to open Cursor chat');
      return false;
    }
  }

  /**
   * Check if text content is eligible to be pasted to Cursor AI.
   *
   * @param _content - The text content (not used)
   * @returns Always true (Cursor AI accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteContent(_content: string): Promise<boolean> {
    return true;
  }

  /**
   * Paste text content to Cursor AI chat.
   *
   * @param content - The text content to paste
   * @returns true if paste succeeded, false otherwise
   */
  async pasteContent(content: string): Promise<boolean> {
    return this.openChatInterfaceAndPaste(content, {
      fn: 'CursorAIDestination.pasteContent',
      contentLength: content.length,
    });
  }

  /**
   * Get user instruction for manual paste.
   *
   * @returns Instruction string for manual paste in Cursor AI chat
   */
  getUserInstruction(): string | undefined {
    return formatMessage(MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS);
  }

  /**
   * Focus Cursor AI chat interface.
   *
   * @returns true if chat focus succeeded, false otherwise
   */
  async focus(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn({ fn: 'CursorAIDestination.focus' }, 'Cursor not available');
      return false;
    }

    const focused = await this.tryFocusCommands({ fn: 'CursorAIDestination.focus' });

    if (!focused) {
      this.logger.warn({ fn: 'CursorAIDestination.focus' }, 'All focus commands failed');
    }

    return focused;
  }

  /**
   * Get success message for jump command.
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI);
  }

  /**
   * Get destination-specific details for logging.
   *
   * @returns Empty object (no additional details)
   */
  getLoggingDetails(): Record<string, unknown> {
    return {};
  }

  /**
   * Check if this Cursor AI destination equals another destination.
   *
   * @param other - The destination to compare against (may be undefined)
   * @returns Promise<true> if both are cursor-ai, Promise<false> otherwise
   */
  async equals(other: PasteDestination | undefined): Promise<boolean> {
    if (!other) {
      return false;
    }
    return this.id === other.id;
  }
}
