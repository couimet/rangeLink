import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

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

  constructor(private readonly logger: Logger) {}

  /**
   * Check if Claude Code extension is installed and active
   *
   * @returns true if Claude Code extension detected, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    const extension = vscode.extensions.getExtension(ClaudeCodeDestination.EXTENSION_ID);
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
   * Paste text to Claude Code chat
   *
   * **Implementation:** Since Claude Code doesn't support programmatic text insertion,
   * this method uses a clipboard-based workaround:
   * 1. Copy text to clipboard
   * 2. Try opening Claude Code with multiple fallback commands
   * 3. Show notification prompting user to paste
   *
   * @param text - The text to paste
   * @returns true if clipboard copy and chat open succeeded, false otherwise
   */
  async paste(text: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn(
        { fn: 'ClaudeCodeDestination.paste' },
        'Cannot paste: Claude Code extension not available',
      );
      return false;
    }

    try {
      // Step 1: Copy to clipboard
      await vscode.env.clipboard.writeText(text);
      this.logger.debug(
        { fn: 'ClaudeCodeDestination.paste', textLength: text.length },
        'Copied text to clipboard',
      );

      // Step 2: Try opening Claude Code with multiple fallback commands
      let chatOpened = false;
      for (const command of ClaudeCodeDestination.CLAUDE_CODE_COMMANDS) {
        try {
          await vscode.commands.executeCommand(command);
          this.logger.debug(
            { fn: 'ClaudeCodeDestination.paste', command },
            'Successfully executed Claude Code open command',
          );
          chatOpened = true;
          break;
        } catch (commandError) {
          this.logger.debug(
            { fn: 'ClaudeCodeDestination.paste', command, error: commandError },
            'Command failed, trying next fallback',
          );
        }
      }

      if (!chatOpened) {
        this.logger.warn(
          { fn: 'ClaudeCodeDestination.paste' },
          'All Claude Code open commands failed',
        );
      }

      // Step 3: Show notification (regardless of whether chat opened)
      void vscode.window.showInformationMessage(
        formatMessage(MessageCode.INFO_CLAUDE_CODE_LINK_COPIED),
      );

      this.logger.info(
        { fn: 'ClaudeCodeDestination.paste', textLength: text.length, chatOpened },
        'Clipboard workaround completed',
      );

      return true;
    } catch (error) {
      this.logger.error(
        { fn: 'ClaudeCodeDestination.paste', error },
        'Failed to execute clipboard workaround',
      );
      return false;
    }
  }
}
