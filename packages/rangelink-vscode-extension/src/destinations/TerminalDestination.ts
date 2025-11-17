import type { Logger } from 'barebone-logger';
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
    const link = formattedLink.link;

    if (!isEligibleForPaste(link)) {
      this.logger.info(
        { fn: 'TerminalDestination.pasteLink', formattedLink, linkLength: link.length },
        'Link not eligible for paste',
      );
      return false;
    }

    if (!this.boundTerminal) {
      this.logger.warn(
        { fn: 'TerminalDestination.pasteLink', formattedLink, linkLength: link.length },
        'Cannot paste: No terminal bound',
      );
      return false;
    }

    const terminalName = this.getTerminalName();

    // Apply smart padding for better UX
    const paddedLink = applySmartPadding(link);

    // Send link without auto-submit (addNewLine = false)
    this.boundTerminal.sendText(paddedLink, false);

    // Auto-focus terminal for seamless workflow
    this.boundTerminal.show(false);

    this.logger.info(
      {
        fn: 'TerminalDestination.pasteLink',
        terminalName,
        formattedLink,
        originalLength: link.length,
        paddedLength: paddedLink.length,
      },
      `Pasted link to terminal: ${terminalName}`,
    );

    return true;
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
    if (!isEligibleForPaste(content)) {
      this.logger.info(
        { fn: 'TerminalDestination.pasteContent', contentLength: content.length },
        'Content not eligible for paste',
      );
      return false;
    }

    if (!this.boundTerminal) {
      this.logger.warn(
        { fn: 'TerminalDestination.pasteContent', contentLength: content.length },
        'Cannot paste: No terminal bound',
      );
      return false;
    }

    const terminalName = this.getTerminalName();

    // Apply smart padding for better UX
    const paddedContent = applySmartPadding(content);

    // Send content without auto-submit (addNewLine = false)
    this.boundTerminal.sendText(paddedContent, false);

    // Auto-focus terminal for seamless workflow
    this.boundTerminal.show(false);

    this.logger.info(
      {
        fn: 'TerminalDestination.pasteContent',
        terminalName,
        originalLength: content.length,
        paddedLength: paddedContent.length,
      },
      `Pasted content to terminal: ${terminalName}`,
    );

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
