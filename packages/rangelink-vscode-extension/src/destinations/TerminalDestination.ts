import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { DestinationType, PasteDestination } from './PasteDestination';
import { applySmartPadding } from '../utils/applySmartPadding';
import { isEligibleForPaste } from '../utils/isEligibleForPaste';

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
   * Paste text to bound terminal with smart padding and focus
   *
   * Validation:
   * - Checks text eligibility (not null/undefined/empty/whitespace-only)
   * - Logs INFO and returns false if text is not eligible
   *
   * Smart padding behavior:
   * - Only adds leading space if text doesn't start with whitespace
   * - Only adds trailing space if text doesn't end with whitespace
   * - Better UX: avoids double-spacing when user already padded text
   *
   * @param text - The text to paste
   * @returns true if paste succeeded, false if validation failed or no terminal bound
   */
  async paste(text: string): Promise<boolean> {
    if (!isEligibleForPaste(text)) {
      this.logger.info({ fn: 'TerminalDestination.paste', text }, 'Text not eligible for paste');
      return false;
    }

    if (!this.boundTerminal) {
      this.logger.warn(
        { fn: 'TerminalDestination.paste', textLength: text.length },
        'Cannot paste: No terminal bound',
      );
      return false;
    }

    const terminalName = this.getTerminalName();

    // Apply smart padding for better UX
    const paddedText = applySmartPadding(text);

    // Send text without auto-submit (addNewLine = false)
    this.boundTerminal.sendText(paddedText, false);

    // Auto-focus terminal for seamless workflow
    this.boundTerminal.show(false);

    this.logger.info(
      {
        fn: 'TerminalDestination.paste',
        terminalName,
        originalLength: text.length,
        paddedLength: paddedText.length,
      },
      `Pasted to terminal: ${terminalName}`,
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
