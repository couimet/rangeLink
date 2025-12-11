import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { applySmartPadding, formatMessage } from '../utils';

import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * GitHub Copilot Chat paste destination
 *
 * Pastes RangeLinks to GitHub Copilot's chat interface using automatic text insertion.
 *
 * **API Details:**
 * - Command: `workbench.action.chat.open`
 * - Parameter: `{ query: string, isPartialQuery: true }`
 * - Behavior: Prefills chat input without auto-submitting (user reviews before sending)
 *
 * **Detection strategy:**
 * - Primary: Command-based detection (checks if `workbench.action.chat.open` exists)
 * - Fallback: Extension detection (`GitHub.copilot-chat`)
 * - Rationale: Command may be built-in or bundled differently across VSCode versions
 *
 * **References:**
 * - Issue: #91 (GitHub Copilot Chat integration)
 * - VSCode API: workbench.action.chat.open command
 */
export class GitHubCopilotChatDestination implements PasteDestination {
  readonly id: DestinationType = 'github-copilot-chat';
  readonly displayName = 'GitHub Copilot Chat';

  private static readonly EXTENSION_ID = 'GitHub.copilot-chat';
  private static readonly CHAT_COMMAND = 'workbench.action.chat.open';

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if GitHub Copilot Chat is available
   *
   * Uses command-based detection (checking if workbench.action.chat.open exists)
   * because GitHub Copilot Chat may be built-in or bundled differently across VSCode versions.
   * Falls back to extension detection if command check fails.
   *
   * @returns true if GitHub Copilot Chat detected, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    // Primary detection: Check if chat command exists
    const commands = await this.ideAdapter.getCommands();
    const commandExists = commands.includes(GitHubCopilotChatDestination.CHAT_COMMAND);

    if (commandExists) {
      this.logger.debug(
        {
          fn: 'GitHubCopilotChatDestination.isAvailable',
          chatCommand: GitHubCopilotChatDestination.CHAT_COMMAND,
          detectionMethod: 'command',
        },
        'GitHub Copilot Chat detected via command availability',
      );
      return true;
    }

    // Fallback detection: Check for extension (older VSCode versions or different packaging)
    const extension = this.ideAdapter.extensions.find(
      (ext) => ext.id === GitHubCopilotChatDestination.EXTENSION_ID,
    );
    const extensionAvailable = extension !== undefined && extension.isActive;

    this.logger.debug(
      {
        fn: 'GitHubCopilotChatDestination.isAvailable',
        extensionId: GitHubCopilotChatDestination.EXTENSION_ID,
        extensionFound: extension !== undefined,
        extensionActive: extension?.isActive ?? false,
        detectionMethod: extensionAvailable ? 'extension' : 'none',
      },
      extensionAvailable
        ? 'GitHub Copilot Chat detected via extension'
        : 'GitHub Copilot Chat not available (command not found, extension not active)',
    );

    return extensionAvailable;
  }

  /**
   * Check if a RangeLink is eligible to be pasted to GitHub Copilot Chat
   *
   * GitHub Copilot has no special eligibility rules - always eligible.
   *
   * @param _formattedLink - The formatted RangeLink (not used)
   * @returns Always true (GitHub Copilot accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteLink(_formattedLink: FormattedLink): Promise<boolean> {
    return true;
  }

  /**
   * Check if text content is eligible to be pasted to GitHub Copilot Chat
   *
   * GitHub Copilot has no special eligibility rules - always eligible.
   *
   * @param _content - The text content (not used)
   * @returns Always true (GitHub Copilot accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteContent(_content: string): Promise<boolean> {
    return true;
  }

  /**
   * Paste a RangeLink to GitHub Copilot Chat with automatic insertion
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns true if paste succeeded, false otherwise
   */
  async pasteLink(formattedLink: FormattedLink): Promise<boolean> {
    return this.sendTextToChat({
      text: formattedLink.link,
      logContext: {
        fn: 'GitHubCopilotChatDestination.pasteLink',
        formattedLink,
        linkLength: formattedLink.link.length,
      },
      unavailableMessage: 'Cannot paste link: GitHub Copilot Chat extension not available',
      successLogMessage: 'Pasted link to GitHub Copilot Chat',
      errorLogMessage: 'Failed to paste link to GitHub Copilot Chat',
    });
  }

  /**
   * Paste text content to GitHub Copilot Chat with automatic insertion
   *
   * Similar to pasteLink() but accepts raw text content instead of FormattedLink.
   *
   * @param content - The text content to paste
   * @returns true if paste succeeded, false otherwise
   */
  async pasteContent(content: string): Promise<boolean> {
    return this.sendTextToChat({
      text: content,
      logContext: {
        fn: 'GitHubCopilotChatDestination.pasteContent',
        contentLength: content.length,
      },
      unavailableMessage: 'Cannot paste content: GitHub Copilot Chat extension not available',
      successLogMessage: 'Pasted content to GitHub Copilot Chat',
      errorLogMessage: 'Failed to paste content to GitHub Copilot Chat',
    });
  }

  /**
   * Send text to GitHub Copilot Chat with automatic insertion
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
    // Apply smart padding for proper spacing in chat input (like Terminal/TextEditor destinations)
    const paddedText = applySmartPadding(options.text);

    return this.executeWithAvailabilityCheck({
      logContext: options.logContext,
      unavailableMessage: options.unavailableMessage,
      successLogMessage: options.successLogMessage,
      errorLogMessage: options.errorLogMessage,
      execute: async () =>
        this.openChat({
          query: paddedText,
          isPartialQuery: true,
        }),
    });
  }

  /**
   * Execute a command with availability check and standardized logging
   *
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
   * Get user instruction for manual paste
   *
   * GitHub Copilot performs automatic paste, so no manual instruction is needed.
   *
   * @returns undefined (no manual instruction needed - automatic paste)
   */
  getUserInstruction(): string | undefined {
    return undefined;
  }

  /**
   * Focus GitHub Copilot Chat interface
   *
   * Opens/focuses the GitHub Copilot Chat panel to bring it into view.
   * Uses the same command as pasteLink() but without query parameter.
   *
   * Used by the "Jump to Bound Destination" command (issue #99).
   *
   * @returns true if chat focus succeeded, false otherwise
   */
  async focus(): Promise<boolean> {
    return this.executeWithAvailabilityCheck({
      logContext: { fn: 'GitHubCopilotChatDestination.focus' },
      unavailableMessage: 'Cannot focus: GitHub Copilot Chat extension not available',
      successLogMessage: 'Focused GitHub Copilot Chat',
      errorLogMessage: 'Failed to focus GitHub Copilot Chat',
      execute: async () => this.openChat(),
    });
  }

  /**
   * Open GitHub Copilot Chat with optional prefilled text
   *
   * Helper to eliminate duplication of executeCommand calls.
   * Handles both cases: with query (for paste) and without query (for focus).
   *
   * @param query - Optional text to prefill in chat input (omit to just focus)
   */
  private async openChat(options?: Record<string, unknown> | undefined): Promise<void> {
    if (options === undefined) {
      await this.ideAdapter.executeCommand(GitHubCopilotChatDestination.CHAT_COMMAND);
    } else {
      await this.ideAdapter.executeCommand(GitHubCopilotChatDestination.CHAT_COMMAND, options);
    }
  }

  /**
   * Get success message for jump command
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_GITHUB_COPILOT_CHAT);
  }

  /**
   * Get destination-specific details for logging
   *
   * GitHub Copilot destinations have no additional details to log beyond displayName.
   *
   * @returns Empty object (no additional details)
   */
  getLoggingDetails(): Record<string, unknown> {
    return {};
  }

  /**
   * Check if this GitHub Copilot destination equals another destination
   *
   * @param other - The destination to compare against (may be undefined)
   * @returns Promise<true> if both are github-copilot, Promise<false> otherwise
   */
  async equals(other: PasteDestination | undefined): Promise<boolean> {
    // Safeguard: Check other is defined
    if (!other) {
      return false;
    }

    // AI assistants are singletons - just compare type
    return this.id === other.id;
  }
}
