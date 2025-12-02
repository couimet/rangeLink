import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { AutoPasteResult } from '../types/AutoPasteResult';
import { PasteContentType } from '../types/PasteContentType';
import { applySmartPadding } from '../utils/applySmartPadding';

import type { ChatPasteHelperFactory } from './ChatPasteHelperFactory';
import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * Abstract base class for AI chat assistant paste destinations.
 *
 * Provides shared functionality for destinations that use clipboard-based paste
 * to chat interfaces (Claude Code, Cursor AI, GitHub Copilot). Eliminates duplication
 * by extracting common patterns:
 * - Clipboard-based paste flow with automatic retry
 * - Multiple fallback command execution
 * - Smart padding application
 * - Unified link/content paste operations
 * - Availability checking and error handling
 *
 * Subclasses must implement destination-specific logic:
 * - isAvailable(): Detection logic (extension check, IDE detection, etc.)
 * - getFocusCommands(): Command IDs to try for opening chat
 * - getUserInstruction(): Manual paste instructions for users
 * - getJumpSuccessMessage(): Status bar message for focus success
 */
export abstract class ChatAssistantDestination implements PasteDestination {
  abstract readonly id: DestinationType;
  abstract readonly displayName: string;

  constructor(
    protected readonly ideAdapter: VscodeAdapter,
    protected readonly chatPasteHelperFactory: ChatPasteHelperFactory,
    protected readonly logger: Logger,
  ) {}

  /**
   * Check if this chat assistant is available.
   *
   * @returns true if chat assistant is available, false otherwise
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get ordered list of commands to try for focusing chat interface.
   *
   * Commands are tried in order until one succeeds. Each destination provides
   * its own command IDs.
   *
   * @returns Array of command IDs to try in order
   */
  protected abstract getFocusCommands(): string[];

  /**
   * Get user instruction for manual paste.
   *
   * Chat assistants attempt automatic paste via ChatPasteHelper. This method provides
   * outcome-aware feedback:
   * - Success: Returns undefined (no manual action needed)
   * - Failure: Returns manual paste instruction specific to this chat assistant
   *
   * @param autoPasteResult - Result of automatic paste attempt
   * @returns Manual paste instruction if automatic paste failed, undefined if succeeded
   */
  abstract getUserInstruction(autoPasteResult: AutoPasteResult): string | undefined;

  /**
   * Get success message for jump command.
   *
   * @returns Formatted i18n message for status bar display
   */
  abstract getJumpSuccessMessage(): string;

  /**
   * Check if a RangeLink is eligible to be pasted to this chat assistant.
   *
   * Chat assistants accept all content, so always returns true.
   *
   * @param _formattedLink - The formatted RangeLink (not used)
   * @returns Always true (chat assistants accept all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteLink(_formattedLink: FormattedLink): Promise<boolean> {
    return true;
  }

  /**
   * Check if text content is eligible to be pasted to this chat assistant.
   *
   * Chat assistants accept all content, so always returns true.
   *
   * @param _content - The text content (not used)
   * @returns Always true (chat assistants accept all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteContent(_content: string): Promise<boolean> {
    return true;
  }

  /**
   * Paste a RangeLink to chat assistant with automatic insertion.
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns true if paste succeeded, false otherwise
   */
  async pasteLink(formattedLink: FormattedLink): Promise<boolean> {
    return this.sendTextToChat({
      contentType: PasteContentType.Link,
      text: formattedLink.link,
      logContext: {
        fn: `${this.constructor.name}.pasteLink`,
        formattedLink,
        linkLength: formattedLink.link.length,
      },
      unavailableMessage: `Cannot paste: ${this.displayName} not available`,
      successLogMessage: `Pasted link to ${this.displayName}`,
      errorLogMessage: `Failed to paste link to ${this.displayName}`,
    });
  }

  /**
   * Paste text content to chat assistant with automatic insertion.
   *
   * @param content - The text content to paste
   * @returns true if paste succeeded, false otherwise
   */
  async pasteContent(content: string): Promise<boolean> {
    return this.sendTextToChat({
      contentType: PasteContentType.Text,
      text: content,
      logContext: {
        fn: `${this.constructor.name}.pasteContent`,
        contentLength: content.length,
      },
      unavailableMessage: `Cannot paste: ${this.displayName} not available`,
      successLogMessage: `Pasted content to ${this.displayName}`,
      errorLogMessage: `Failed to paste content to ${this.displayName}`,
    });
  }

  /**
   * Focus chat assistant interface.
   *
   * @returns true if chat focus succeeded, false otherwise
   */
  async focus(): Promise<boolean> {
    return this.executeWithAvailabilityCheck({
      logContext: { fn: `${this.constructor.name}.focus` },
      unavailableMessage: `Cannot focus: ${this.displayName} not available`,
      successLogMessage: `Focused ${this.displayName}`,
      errorLogMessage: `Failed to focus ${this.displayName}`,
      execute: async () => this.openChat(),
    });
  }

  /**
   * Get destination-specific details for logging.
   *
   * Chat assistants have no additional details beyond base destination info.
   *
   * @returns Empty object (no additional details)
   */
  getLoggingDetails(): Record<string, unknown> {
    return {};
  }

  /**
   * Check if this destination equals another destination.
   *
   * @param other - The destination to compare against (may be undefined)
   * @returns Promise<true> if same destination type, Promise<false> otherwise
   */
  async equals(other: PasteDestination | undefined): Promise<boolean> {
    if (!other) {
      return false;
    }
    return this.id === other.id;
  }

  /**
   * Send text to chat assistant with automatic insertion.
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
   * Open chat interface and optionally paste text.
   *
   * Attempts to focus chat using multiple fallback commands,
   * then attempts automatic paste if text is provided.
   *
   * @param text - Optional text to paste after opening chat
   */
  private async openChat(text?: string): Promise<void> {
    await this.tryFocusCommands({ fn: `${this.constructor.name}.openChat` });

    if (text) {
      const chatPasteHelper = this.chatPasteHelperFactory.create();
      await chatPasteHelper.attemptPaste(text, { fn: `${this.constructor.name}.openChat` });
    }
  }

  /**
   * Try focus commands until one succeeds.
   *
   * @param logContext - Logging context (at minimum must contain fn)
   * @returns true if any command succeeded, false if all failed
   */
  private async tryFocusCommands(logContext: LoggingContext): Promise<boolean> {
    const commands = this.getFocusCommands();
    for (const command of commands) {
      try {
        await this.ideAdapter.executeCommand(command);
        return true;
      } catch (error) {
        this.logger.info(
          { ...logContext, command, error },
          'Failed to get focus, trying next fallback',
        );
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
}
