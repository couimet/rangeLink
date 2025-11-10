import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

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

  constructor(private readonly logger: Logger) {}

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
    const appName = vscode.env.appName.toLowerCase();
    const appNameMatch = appName.includes('cursor');
    this.logger.debug(
      { fn: 'CursorAIDestination.isAvailable', method: 'appName', appName, detected: appNameMatch },
      appNameMatch ? 'Cursor detected via appName' : 'Cursor not detected via appName',
    );

    if (appNameMatch) {
      return true;
    }

    // Method 2: Check for Cursor-specific extensions
    const cursorExtensions = vscode.extensions.all.filter((ext) => ext.id.startsWith('cursor.'));
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
    const uriScheme = vscode.env.uriScheme;
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
   * Paste text to Cursor AI chat
   *
   * **Implementation:** Since Cursor doesn't support programmatic text insertion,
   * this method uses a clipboard-based workaround:
   * 1. Copy text to clipboard
   * 2. Open Cursor chat panel
   * 3. Show notification prompting user to paste
   *
   * @param text - The text to paste
   * @returns true if clipboard copy and chat open succeeded, false otherwise
   */
  async paste(text: string): Promise<boolean> {
    if (!(await this.isAvailable())) {
      this.logger.warn(
        { fn: 'CursorAIDestination.paste' },
        'Cannot paste: Not running in Cursor IDE',
      );
      return false;
    }

    try {
      // Step 1: Copy to clipboard
      await vscode.env.clipboard.writeText(text);
      this.logger.debug(
        { fn: 'CursorAIDestination.paste', textLength: text.length },
        'Copied text to clipboard',
      );

      // Step 2: Try opening chat panel with multiple fallback commands
      let chatOpened = false;
      for (const command of CursorAIDestination.CHAT_COMMANDS) {
        try {
          await vscode.commands.executeCommand(command);
          this.logger.debug(
            { fn: 'CursorAIDestination.paste', command },
            'Successfully executed chat open command',
          );
          chatOpened = true;
          break;
        } catch (commandError) {
          this.logger.debug(
            { fn: 'CursorAIDestination.paste', command, error: commandError },
            'Command failed, trying next fallback',
          );
        }
      }

      if (!chatOpened) {
        this.logger.warn(
          { fn: 'CursorAIDestination.paste' },
          'All chat open commands failed',
        );
      }

      // Step 3: Show notification (regardless of whether chat opened)
      void vscode.window.showInformationMessage(
        'RangeLink copied to clipboard. Paste (Cmd/Ctrl+V) in Cursor chat to use.',
      );

      this.logger.info(
        { fn: 'CursorAIDestination.paste', textLength: text.length, chatOpened },
        'Clipboard workaround completed',
      );

      return true;
    } catch (error) {
      this.logger.error(
        { fn: 'CursorAIDestination.paste', error },
        'Failed to execute clipboard workaround',
      );
      return false;
    }
  }
}
