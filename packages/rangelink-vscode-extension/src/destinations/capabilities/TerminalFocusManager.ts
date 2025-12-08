import type { Logger, LoggingContext } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusManager } from './FocusManager';

/**
 * Focuses terminal by showing it.
 *
 * Used by:
 * - Terminal destinations: Ensure terminal is visible before paste
 */
export class TerminalFocusManager implements FocusManager {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly terminal: vscode.Terminal,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<void> {
    try {
      await this.ideAdapter.showTerminal(this.terminal);
      this.logger.debug({ ...context }, 'Terminal focused via show()');
    } catch (error) {
      this.logger.warn({ ...context, error }, 'Failed to focus terminal');
    }
  }
}
