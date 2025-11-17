import type { Logger, LoggingContext } from 'barebone-logger';
import type { FormattedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { applySmartPadding } from '../utils/applySmartPadding';
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
      logContext: { fn: 'TerminalDestination.pasteLink', formattedLink, linkLength: formattedLink.link.length },
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

    if (!this.boundTerminal) {
      this.logger.warn(logContext, 'Cannot paste: No terminal bound');
      return false;
    }

    const terminalName = this.getTerminalName();
    const paddedText = applySmartPadding(text);

    // Send text without auto-submit (addNewLine = false)
    this.boundTerminal.sendText(paddedText, false);

    // Auto-focus terminal for seamless workflow
    this.boundTerminal.show(false);

    // Build success log context - spread logContext to preserve all fields
    const successContext: LoggingContext = {
      ...logContext,
      terminalName,
      originalLength: text.length,
      paddedLength: paddedText.length,
    };

    this.logger.info(successContext, successLogMessage(terminalName!));

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
}
