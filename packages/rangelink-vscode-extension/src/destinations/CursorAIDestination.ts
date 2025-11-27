import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../types/AutoPasteResult';
import { MessageCode } from '../types/MessageCode';
import { applySmartPadding } from '../utils/applySmartPadding';
import { formatMessage } from '../utils/formatMessage';

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
   * Send text to Cursor AI chat with automatic insertion.
   *
   * Shared helper for pasteLink() and pasteContent() to eliminate duplication.
   * Applies smart padding before sending to ensure proper spacing in chat input.
   *
   * @param options - Configuration for text sending
   * @returns true if paste succeeded, false if unavailable or error occurred
   */
  private async sendTextToChat(options: {
    text: string;
    logContext: LoggingContext;
    unavailableMessage: string;
    successLogMessage: string;
    errorLogMessage: string;
  }): Promise<boolean> {
    // Apply smart padding for proper spacing in chat input
    const paddedText = applySmartPadding(options.text);

    return this.executeWithAvailabilityCheck({
      logContext: options.logContext,
      unavailableMessage: options.unavailableMessage,
      successLogMessage: options.successLogMessage,
      errorLogMessage: options.errorLogMessage,
      execute: async () => this.openChat(paddedText),
    });
  }

  /**
   * Open Cursor AI chat interface and optionally paste text.
   *
   * Attempts to focus Cursor AI using multiple fallback commands,
   * then attempts automatic paste if text is provided.
   *
   * @param text - Optional text to paste after opening chat
   */
  private async openChat(text?: string): Promise<void> {
    await this.tryFocusCommands();

    if (text) {
      const chatPasteHelper = this.chatPasteHelperFactory.create();
      await chatPasteHelper.attemptPaste(text, { fn: 'CursorAIDestination.openChat' });
    }
  }

  /**
   * Try focus commands until one succeeds.
   *
   * @returns true if any command succeeded, false if all failed
   */
  private async tryFocusCommands(): Promise<boolean> {
    for (const command of CursorAIDestination.CHAT_COMMANDS) {
      try {
        await this.ideAdapter.executeCommand(command);
        return true;
      } catch {
        // Try next fallback
        continue;
      }
    }
    return false;
  }

  /**
   * Generic helper that eliminates duplication across pasteLink(), pasteContent(), and focus().
   * Handles the common pattern: check availability → execute command → log result.
   *
   * @param options - Configuration for command execution
   * @returns true if command succeeded, false if unavailable or error occurred
   */
  private async executeWithAvailabilityCheck(options: {
    logContext: LoggingContext;
    unavailableMessage: string;
    successLogMessage: string;
    errorLogMessage: string;
    execute: () => Promise<void>;
  }): Promise<boolean> {
    const { logContext, unavailableMessage, successLogMessage, errorLogMessage, execute } = options;

    if (!(await this.isAvailable())) {
      this.logger.warn(logContext, unavailableMessage);
      return false;
    }

    try {
      await execute();
      this.logger.info(logContext, successLogMessage);
      return true;
    } catch (error) {
      this.logger.error({ ...logContext, error }, errorLogMessage);
      return false;
    }
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
