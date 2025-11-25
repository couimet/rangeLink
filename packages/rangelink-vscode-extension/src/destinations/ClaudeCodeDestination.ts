import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

import type { ChatPasteHelperFactory } from './ChatPasteHelperFactory';
import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * Claude Code Extension paste destination.
 *
 * Automatically pastes RangeLinks to Claude Code's chat interface.
 */
export class ClaudeCodeDestination implements PasteDestination {
  readonly id: DestinationType = 'claude-code';
  readonly displayName = 'Claude Code Chat';

  // Commands to try opening Claude Code (in order of preference)
  private static readonly CLAUDE_CODE_COMMANDS = [
    'claude-vscode.focus', // Primary: Direct input focus (Cmd+Escape)
    'claude-vscode.sidebar.open', // Fallback: Open sidebar
    'claude-vscode.editor.open', // Fallback: Open in new tab
  ];

  private static readonly EXTENSION_ID = 'anthropic.claude-code';

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly chatPasteHelperFactory: ChatPasteHelperFactory,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if Claude Code extension is installed and active.
   *
   * @returns true if Claude Code extension detected, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    const extension = this.ideAdapter.extensions.find(
      (ext) => ext.id === ClaudeCodeDestination.EXTENSION_ID,
    );
    const isAvailable = extension !== undefined && extension.isActive;

    this.logger.debug(
      {
        fn: 'ClaudeCodeDestination.isAvailable',
        extensionId: ClaudeCodeDestination.EXTENSION_ID,
        found: extension !== undefined,
        active: extension?.isActive ?? false,
        detected: isAvailable,
      },
      isAvailable
        ? 'Claude Code extension detected and active'
        : 'Claude Code extension not available',
    );

    return isAvailable;
  }

  /**
   * Check if a RangeLink is eligible to be pasted to Claude Code.
   *
   * @param _formattedLink - The formatted RangeLink (not used)
   * @returns Always true (Claude Code accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteLink(_formattedLink: FormattedLink): Promise<boolean> {
    return true;
  }

  /**
   * Paste a RangeLink to Claude Code chat.
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns true if paste succeeded, false otherwise
   */
  async pasteLink(formattedLink: FormattedLink): Promise<boolean> {
    return this.openChatInterfaceAndPaste(formattedLink.link, {
      fn: 'ClaudeCodeDestination.pasteLink',
      formattedLink,
      linkLength: formattedLink.link.length,
    });
  }

  /**
   * Open Claude Code chat interface with fallback command attempts
   *
   * Tries multiple commands in order of preference until one succeeds.
   *
   * @param contextInfo - Logging context with fn name and content metadata
   * @returns true if chat open succeeded or commands attempted, false if extension unavailable
   */
  private async openChatInterface(contextInfo: LoggingContext): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn(contextInfo, 'Cannot paste: Claude Code extension not available');
      return false;
    }

    try {
      // Try opening Claude Code with multiple fallback commands
      let chatOpened = false;
      for (const command of ClaudeCodeDestination.CLAUDE_CODE_COMMANDS) {
        try {
          await this.ideAdapter.executeCommand(command);
          this.logger.debug(
            { ...contextInfo, command },
            'Successfully executed Claude Code open command',
          );
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
        this.logger.warn(contextInfo, 'All Claude Code open commands failed');
      }

      this.logger.info({ ...contextInfo, chatOpened }, 'Claude Code open completed');

      return true;
    } catch (error) {
      this.logger.error({ ...contextInfo, error }, 'Failed to open Claude Code');
      return false;
    }
  }

  /**
   * Check if text content is eligible to be pasted to Claude Code.
   *
   * @param _content - The text content (not used)
   * @returns Always true (Claude Code accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteContent(_content: string): Promise<boolean> {
    return true;
  }

  /**
   * Paste text content to Claude Code chat.
   *
   * @param content - The text content to paste
   * @returns true if paste succeeded, false otherwise
   */
  async pasteContent(content: string): Promise<boolean> {
    return this.openChatInterfaceAndPaste(content, {
      fn: 'ClaudeCodeDestination.pasteContent',
      contentLength: content.length,
    });
  }

  /**
   * Get user instruction for manual paste.
   *
   * @returns Instruction string for manual paste in Claude Code
   */
  getUserInstruction(): string | undefined {
    return formatMessage(MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS);
  }

  /**
   * Focus Claude Code chat interface
   *
   * Opens/focuses the Claude Code chat panel to bring it into view.
   * Reuses the same command sequence as pasteLink().
   *
   * Used by the "Jump to Bound Destination" command (issue #99).
   *
   * @returns true if chat focus succeeded, false otherwise
   */
  async focus(): Promise<boolean> {
    return this.openChatInterface({
      fn: 'ClaudeCodeDestination.focus',
    });
  }

  /**
   * Get success message for jump command.
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE);
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
   * Check if this Claude Code destination equals another destination.
   *
   * @param other - The destination to compare against (may be undefined)
   * @returns Promise<true> if both are claude-code, Promise<false> otherwise
   */
  async equals(other: PasteDestination | undefined): Promise<boolean> {
    if (!other) {
      return false;
    }
    return this.id === other.id;
  }
}
