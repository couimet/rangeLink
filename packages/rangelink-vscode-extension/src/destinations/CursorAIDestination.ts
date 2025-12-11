import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../types/AutoPasteResult';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils';

import { ChatAssistantDestination } from './ChatAssistantDestination';
import type { ChatPasteHelperFactory } from './ChatPasteHelperFactory';
import type { DestinationType } from './PasteDestination';

/**
 * Cursor AI Assistant paste destination.
 *
 * Automatically pastes RangeLinks to Cursor's integrated AI chat interface.
 * Extends ChatAssistantDestination to inherit shared chat assistant logic.
 */
export class CursorAIDestination extends ChatAssistantDestination {
  readonly id: DestinationType = 'cursor-ai';
  readonly displayName = 'Cursor AI Assistant';

  // Commands to try opening chat panel (in order of preference)
  private static readonly CHAT_COMMANDS = [
    'aichat.newchataction', // Primary: Cursor-specific command (Cmd+L / Ctrl+L)
    'workbench.action.toggleAuxiliaryBar', // Fallback: Toggle secondary sidebar
  ];

  constructor(
    ideAdapter: VscodeAdapter,
    chatPasteHelperFactory: ChatPasteHelperFactory,
    logger: Logger,
  ) {
    super(ideAdapter, chatPasteHelperFactory, logger);
  }

  /**
   * Check if running in Cursor IDE.
   *
   * Uses multiple detection methods via detectCursorIDE().
   *
   * @returns true if Cursor IDE detected, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    return this.detectCursorIDE();
  }

  /**
   * Detect Cursor IDE using multiple detection methods.
   *
   * Methods (in order):
   * 1. appName check (primary)
   * 2. Cursor-specific extensions check
   * 3. URI scheme check
   *
   * @returns true if Cursor IDE detected by any method, false otherwise
   */
  private detectCursorIDE(): boolean {
    // Method 1: Check app name (PRIMARY)
    const appName = this.ideAdapter.appName.toLowerCase();
    if (appName.includes('cursor')) {
      return true;
    }

    // Method 2: Check for Cursor-specific extensions
    const hasCursorExtensions = this.ideAdapter.extensions.some((ext) =>
      ext.id.startsWith('cursor.'),
    );
    if (hasCursorExtensions) {
      return true;
    }

    // Method 3: Check URI scheme
    const uriScheme = this.ideAdapter.uriScheme;
    if (uriScheme === 'cursor') {
      return true;
    }

    return false;
  }

  /**
   * Get ordered list of commands to try for focusing Cursor AI chat.
   *
   * @returns Array of command IDs to try in order
   */
  protected getFocusCommands(): string[] {
    return CursorAIDestination.CHAT_COMMANDS;
  }

  /**
   * Get user instruction for manual paste.
   *
   * Returns manual paste instruction only when automatic paste fails.
   * When automatic paste succeeds, returns undefined (no manual action needed).
   *
   * @param autoPasteResult - Result of automatic paste attempt
   * @returns Manual paste instruction if automatic paste failed, undefined if succeeded
   */
  getUserInstruction(autoPasteResult: AutoPasteResult): string | undefined {
    if (autoPasteResult === AutoPasteResult.Success) {
      return undefined; // Automatic paste succeeded, no manual action needed
    }
    return formatMessage(MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS);
  }

  /**
   * Get success message for jump command.
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI);
  }
}
