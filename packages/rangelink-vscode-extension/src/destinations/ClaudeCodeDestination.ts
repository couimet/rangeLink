import type { Logger } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * Claude Code Extension paste destination
 *
 * Pastes RangeLinks to Claude Code's chat interface.
 *
 * **LIMITATION:** Claude Code does not support programmatically sending text to chat.
 * Similar to Cursor AI, no working command exists to send text parameters to Claude Code chat.
 *
 * **Workaround:** Copy to clipboard + open chat panel + user pastes manually.
 *
 * **Detection strategy:**
 * - Check for extension: `anthropic.claude-code`
 *
 * **Commands to try (with fallback):**
 * - `claude-vscode.focus` - Direct input focus (Cmd+Escape)
 * - `claude-vscode.sidebar.open` - Open sidebar panel
 * - `claude-vscode.editor.open` - Open in new tab
 *
 * **References:**
 * - Research: docs/RESEARCH-CLAUDE-CODE-INTEGRATION-UPDATE.md
 * - Questions: .claude-questions/0027-claude-code-destination-implementation.txt
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
    private readonly logger: Logger,
  ) {}

  /**
   * Check if Claude Code extension is installed and active
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
   * Check if a RangeLink is eligible to be pasted to Claude Code
   *
   * Claude Code has no special eligibility rules - always eligible.
   *
   * @param _formattedLink - The formatted RangeLink (not used)
   * @returns Always true (Claude Code accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteLink(_formattedLink: FormattedLink): Promise<boolean> {
    return true;
  }

  /**
   * Paste a RangeLink to Claude Code chat
   *
   * **Implementation:** Since Claude Code doesn't support programmatic text insertion,
   * this method opens Claude Code chat interface. The caller (RangeLinkService) handles
   * clipboard copy and user notification.
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns true if chat open succeeded, false otherwise
   */
  async pasteLink(formattedLink: FormattedLink): Promise<boolean> {
    return this.openChatInterface({
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
  private async openChatInterface(contextInfo: {
    fn: string;
    contentLength?: number;
    formattedLink?: FormattedLink;
    linkLength?: number;
  }): Promise<boolean> {
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
   * Get user instruction for manual paste (clipboard-based destination)
   *
   * @returns Instruction string for manual paste in Claude Code
   */
  getUserInstruction(): string | undefined {
    return formatMessage(MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS);
  }
}
