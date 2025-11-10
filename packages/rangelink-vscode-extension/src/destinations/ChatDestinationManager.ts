import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { DestinationType, PasteDestination } from './PasteDestination';
import { DestinationFactory } from './DestinationFactory';

/**
 * Minimal chat destination manager for Phase 2
 *
 * Manages binding to chat destinations (Cursor AI, GitHub Copilot, etc.)
 * while TerminalBindingManager continues to handle terminal bindings.
 *
 * **Temporary solution:** This manager will be merged into PasteDestinationManager
 * in Phase 3 when we unify all destination management.
 *
 * **Design:**
 * - Only one chat destination bound at a time
 * - Simple bind/unbind pattern (no automatic cleanup)
 * - Delegates paste to bound destination
 * - Coexists with TerminalBindingManager
 */
export class ChatDestinationManager {
  private boundDestination: PasteDestination | undefined;

  constructor(
    private readonly factory: DestinationFactory,
    private readonly logger: Logger,
  ) {}

  /**
   * Bind to a chat destination
   *
   * @param type - The destination type to bind (e.g., 'cursor-ai')
   * @returns true if binding succeeded, false otherwise
   */
  async bind(type: DestinationType): Promise<boolean> {
    // Check if already bound
    if (this.boundDestination) {
      const currentType = this.boundDestination.id;
      this.logger.warn(
        { fn: 'ChatDestinationManager.bind', currentType, requestedType: type },
        `Already bound to ${this.boundDestination.displayName}`,
      );

      // Show error to user
      // Note: Using window here directly for simplicity - in Phase 3 we'll inject window mock
      vscode.window.showErrorMessage(
        `RangeLink: Already bound to ${this.boundDestination.displayName}. Unbind first.`,
      );

      return false;
    }

    // Create destination
    const destination = this.factory.create(type);

    // Check if destination is available
    if (!(await destination.isAvailable())) {
      this.logger.warn(
        { fn: 'ChatDestinationManager.bind', type },
        `Cannot bind: ${destination.displayName} not available`,
      );

      // Show error to user (Q6: Option A - fail immediately with clear feedback)
      vscode.window.showErrorMessage(
        `RangeLink: Cannot bind ${destination.displayName} - not running in ${destination.displayName.replace(' Assistant', '')} IDE`,
      );

      return false;
    }

    // Bind
    this.boundDestination = destination;

    this.logger.info(
      { fn: 'ChatDestinationManager.bind', type },
      `Successfully bound to ${destination.displayName}`,
    );

    // Show success notification (Q3: Option A - simple notification)
    vscode.window.setStatusBarMessage(`✓ RangeLink bound to ${destination.displayName}`, 3000);

    return true;
  }

  /**
   * Unbind current destination
   */
  unbind(): void {
    if (!this.boundDestination) {
      this.logger.info({ fn: 'ChatDestinationManager.unbind' }, 'No destination bound');

      // Show info to user
      vscode.window.setStatusBarMessage('RangeLink: No chat destination bound', 2000);

      return;
    }

    const displayName = this.boundDestination.displayName;
    this.boundDestination = undefined;

    this.logger.info({ fn: 'ChatDestinationManager.unbind', displayName }, `Unbound from ${displayName}`);

    // Show success notification
    vscode.window.setStatusBarMessage(`✓ RangeLink unbound from ${displayName}`, 2000);
  }

  /**
   * Check if any chat destination is bound
   */
  isBound(): boolean {
    return this.boundDestination !== undefined;
  }

  /**
   * Get current bound destination (for status display)
   */
  getBoundDestination(): PasteDestination | undefined {
    return this.boundDestination;
  }

  /**
   * Send text to bound destination
   *
   * @param text - The text to paste
   * @returns true if sent successfully, false otherwise
   */
  async sendToDestination(text: string): Promise<boolean> {
    if (!this.boundDestination) {
      this.logger.debug({ fn: 'ChatDestinationManager.sendToDestination' }, 'No destination bound');
      return false;
    }

    const result = await this.boundDestination.paste(text);

    if (!result) {
      this.logger.error(
        { fn: 'ChatDestinationManager.sendToDestination', destinationType: this.boundDestination.id },
        'Paste failed',
      );
    }

    return result;
  }
}
