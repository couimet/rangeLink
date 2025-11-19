import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { MessageCode } from '../types/MessageCode';
import { applySmartPadding } from '../utils/applySmartPadding';
import { formatMessage } from '../utils/formatMessage';
import { isEligibleForPaste } from '../utils/isEligibleForPaste';

import type { DestinationType, PasteDestination } from './PasteDestination';

/**
 * Terminal destination implementation for pasting RangeLinks
 *
 * Extracts terminal paste logic from TerminalBindingManager into reusable destination.
 * Implements smart padding: only adds spaces if text doesn't already have them.
 */
export class TerminalDestination implements PasteDestination {
  readonly id: DestinationType = 'terminal';
  readonly displayName = 'Terminal';

  private boundTerminal: vscode.Terminal | undefined;

  constructor(private readonly logger: Logger) {}

  /**
   * Check if terminal destination is available (has bound terminal)
   */
  async isAvailable(): Promise<boolean> {
    return this.boundTerminal !== undefined;
  }

  /**
   * Check if RangeLink is eligible for paste to terminal
   *
   * Terminal always returns true - all links are eligible when terminal is available.
   * Eligibility checks are primarily for TextEditorDestination to avoid self-paste.
   *
   * @param _formattedLink - The formatted RangeLink (unused)
   * @returns Promise resolving to true (always eligible)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteLink(_formattedLink: FormattedLink): Promise<boolean> {
    return true;
  }

  /**
   * Check if text content is eligible to be pasted to terminal
   *
   * Terminal has no special eligibility rules - always eligible.
   *
   * @param _content - The text content (not used)
   * @returns Always true (Terminal accepts all content)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEligibleForPasteContent(_content: string): Promise<boolean> {
    return true;
  }

  /**
   * Get user instruction for manual paste
   *
   * Terminal performs automatic paste, so no manual instruction is needed.
   *
   * @returns undefined (no manual instruction needed)
   */
  getUserInstruction(): string | undefined {
    return undefined;
  }

  /**
   * Focus the bound terminal
   *
   * Shows the terminal panel to bring it into view.
   * Used by the "Jump to Bound Destination" command (issue #99).
   *
   * @returns true if terminal focused successfully, false if no terminal bound
   */
  async focus(): Promise<boolean> {
    const terminalName = this.focusAndGetTerminalName({
      fn: 'TerminalDestination.focus',
    });

    if (!terminalName) {
      return false;
    }

    this.logger.info(
      { fn: 'TerminalDestination.focus', terminalName },
      `Focused terminal: ${terminalName}`,
    );

    return true;
  }

  /**
   * Focus bound terminal and return its name
   *
   * Validates terminal is bound, shows it, and returns its name.
   * Used by both focus() command and paste operations to ensure terminal is visible.
   *
   * @param logContext - Logging context for error messages
   * @returns Terminal name if successful, undefined if no terminal bound
   */
  private focusAndGetTerminalName(logContext: LoggingContext): string | undefined {
    if (!this.boundTerminal) {
      this.logger.warn(logContext, 'Cannot focus: No terminal bound');
      return undefined;
    }

    const terminalName = this.getTerminalName();

    // Show terminal (false = don't preserve focus, steal focus to terminal)
    this.boundTerminal.show(false);

    return terminalName;
  }

  /**
   * Paste a RangeLink to bound terminal with smart padding and focus
   *
   * Validation:
   * - Checks link eligibility (not null/undefined/empty/whitespace-only)
   * - Logs INFO and returns false if link is not eligible
   *
   * Smart padding behavior:
   * - Only adds leading space if link doesn't start with whitespace
   * - Only adds trailing space if link doesn't end with whitespace
   * - Better UX: avoids double-spacing when user already padded link
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns true if paste succeeded, false if validation failed or no terminal bound
   */
  async pasteLink(formattedLink: FormattedLink): Promise<boolean> {
    return this.sendTextToTerminal({
      text: formattedLink.link,
      logContext: {
        fn: 'TerminalDestination.pasteLink',
        formattedLink,
        linkLength: formattedLink.link.length,
      },
      ineligibleMessage: 'Link not eligible for paste',
      successLogMessage: (terminalName: string) => `Pasted link to terminal: ${terminalName}`,
    });
  }

  /**
   * Paste text content to bound terminal with smart padding and focus
   *
   * Similar to pasteLink() but accepts raw text content instead of FormattedLink.
   * Used for pasting selected text directly to terminal (issue #89).
   *
   * Validation:
   * - Checks content eligibility (not null/undefined/empty/whitespace-only)
   * - Logs INFO and returns false if content is not eligible
   *
   * @param content - The text content to paste
   * @returns true if paste succeeded, false otherwise
   */
  async pasteContent(content: string): Promise<boolean> {
    return this.sendTextToTerminal({
      text: content,
      logContext: { fn: 'TerminalDestination.pasteContent', contentLength: content.length },
      ineligibleMessage: 'Content not eligible for paste',
      successLogMessage: (terminalName: string) => `Pasted content to terminal: ${terminalName}`,
    });
  }

  /**
   * Send text to bound terminal with smart padding and focus
   *
   * Shared helper for pasteLink() and pasteContent() to eliminate duplication.
   * Handles validation, padding, sending, focus, and logging.
   *
   * @param options - Configuration for text sending
   * @returns true if paste succeeded, false if validation failed or no terminal bound
   */
  private async sendTextToTerminal(options: {
    text: string;
    logContext: LoggingContext;
    ineligibleMessage: string;
    successLogMessage: (terminalName: string) => string;
  }): Promise<boolean> {
    const { text, logContext, ineligibleMessage, successLogMessage } = options;

    if (!isEligibleForPaste(text)) {
      this.logger.info(logContext, ineligibleMessage);
      return false;
    }

    // Validate terminal is bound and focus it
    const terminalName = this.focusAndGetTerminalName(logContext);
    if (!terminalName) {
      return false;
    }

    const paddedText = applySmartPadding(text);

    // Send text without auto-submit (addNewLine = false)
    this.boundTerminal!.sendText(paddedText, false);

    // Build success log context - spread logContext to preserve all fields
    const successContext: LoggingContext = {
      ...logContext,
      terminalName,
      originalLength: text.length,
      paddedLength: paddedText.length,
    };

    this.logger.info(successContext, successLogMessage(terminalName));

    return true;
  }

  /**
   * Update bound terminal reference
   *
   * Called by PasteDestinationManager when user binds/unbinds terminal.
   * This is external state management - the manager owns the binding logic.
   */
  setTerminal(terminal: vscode.Terminal | undefined): void {
    this.boundTerminal = terminal;
    this.logger.debug(
      { fn: 'TerminalDestination.setTerminal', terminalName: terminal?.name },
      terminal ? `Terminal set: ${terminal.name}` : 'Terminal cleared',
    );
  }

  /**
   * Get bound terminal name for status display
   *
   * @returns Terminal name or undefined if no terminal bound
   */
  getTerminalName(): string | undefined {
    return this.boundTerminal?.name;
  }

  /**
   * Get success message for jump command
   *
   * @returns Formatted i18n message for status bar display
   */
  getJumpSuccessMessage(): string {
    const terminalName = this.getTerminalName() || 'Unnamed Terminal';
    return formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_TERMINAL, { terminalName });
  }

  /**
   * Get destination-specific details for logging
   *
   * @returns Terminal name for logging context
   */
  getLoggingDetails(): Record<string, unknown> {
    if (!this.boundTerminal) {
      return {};
    }
    const terminalName = this.getTerminalName() || 'Unnamed Terminal';
    return { terminalName };
  }

  /**
   * Check if this terminal equals another destination
   *
   * @param other - The destination to compare against (may be undefined)
   * @returns Promise<true> if same terminal, Promise<false> otherwise
   */
  async equals(other: PasteDestination | undefined): Promise<boolean> {
    // Safeguard 1: Check other is defined
    if (!other) {
      return false;
    }

    // Safeguard 2: Check type matches
    if (other.id !== 'terminal') {
      return false;
    }

    // Safeguard 3: Check other has terminal resource (type assertion - Option B)
    const otherAsTerminal = other as TerminalDestination;
    const otherTerminal = otherAsTerminal.terminal;
    if (!otherTerminal) {
      // Should never happen if construction is correct, but be defensive
      this.logger.warn(
        { fn: 'TerminalDestination.equals' },
        'Other terminal destination missing terminal resource',
      );
      return false;
    }

    // Get process IDs for comparison
    const [thisPid, otherPid] = await Promise.all([
      this.terminal.processId,
      otherTerminal.processId,
    ]);

    // Safeguard 4: Both processIds must be defined for valid comparison
    if (thisPid === undefined || otherPid === undefined) {
      this.logger.debug(
        { fn: 'TerminalDestination.equals', thisPid, otherPid },
        'Cannot compare terminals: processId undefined (terminal may not be started yet)',
      );
      return false;
    }

    return thisPid === otherPid;
  }
}
