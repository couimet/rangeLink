import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../types/AutoPasteResult';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

import { ChatAssistantDestination } from './ChatAssistantDestination';
import type { ChatPasteHelperFactory } from './ChatPasteHelperFactory';
import type { DestinationType } from './PasteDestination';

/**
 * Claude Code Extension paste destination.
 *
 * Automatically pastes RangeLinks to Claude Code's chat interface.
 * Extends ChatAssistantDestination to inherit shared chat assistant logic.
 */
export class ClaudeCodeDestination extends ChatAssistantDestination {
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
    ideAdapter: VscodeAdapter,
    chatPasteHelperFactory: ChatPasteHelperFactory,
    logger: Logger,
  ) {
    super(ideAdapter, chatPasteHelperFactory, logger);
  }

  /**
   * Check if Claude Code extension is installed and active.
   *
   * @returns true if Claude Code extension detected, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    const extension = this.ideAdapter.getExtension(ClaudeCodeDestination.EXTENSION_ID);
    return extension !== undefined && extension.isActive;
  }

  /**
   * Get ordered list of commands to try for focusing Claude Code chat.
   *
   * @returns Array of command IDs to try in order
   */
  protected getFocusCommands(): string[] {
    return ClaudeCodeDestination.CLAUDE_CODE_COMMANDS;
  }

  /**
   * Send text to Claude Code chat with automatic insertion.
   *
   * Shared helper for pasteLink() and pasteContent() to eliminate duplication.
   * Applies smart padding before sending to ensure proper spacing in chat input.
   *
   * @param options - Configuration for text sending
   * @returns true if paste succeeded, false if unavailable or error occurred
   */
  private async sendTextToChat(options: {
    contentType: PasteContentType;
    text: string;
    logContext: LoggingContext;
    unavailableMessage: string;
    successLogMessage: string;
    errorLogMessage: string;
  }): Promise<boolean> {
    // Apply smart padding for proper spacing in chat input
    const paddedText = applySmartPadding(options.text);

    // Enhance log context with content type for better debugging
    const enhancedLogContext: LoggingContext = {
      ...options.logContext,
      contentType: options.contentType,
    };

    return this.executeWithAvailabilityCheck({
      logContext: enhancedLogContext,
      unavailableMessage: options.unavailableMessage,
      successLogMessage: options.successLogMessage,
      errorLogMessage: options.errorLogMessage,
      execute: async () => this.openChat(paddedText),
    });
  }

  /**
   * Open Claude Code chat interface and optionally paste text.
   *
   * Attempts to focus Claude Code using multiple fallback commands,
   * then attempts automatic paste if text is provided.
   *
   * @param text - Optional text to paste after opening chat
   */
  private async openChat(text?: string): Promise<void> {
    await this.tryFocusCommands();

    if (text) {
      const chatPasteHelper = this.chatPasteHelperFactory.create();
      await chatPasteHelper.attemptPaste(text, { fn: 'ClaudeCodeDestination.openChat' });
    }
  }

  /**
   * Try focus commands until one succeeds.
   *
   * @returns true if any command succeeded, false if all failed
   */
  private async tryFocusCommands(): Promise<boolean> {
    for (const command of ClaudeCodeDestination.CLAUDE_CODE_COMMANDS) {
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
    return formatMessage(MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS);
  }

  /**
   * Get success message for jump command.
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE);
  }
}
