import type { Logger, LoggingContext } from 'barebone-logger';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import type { FocusManager } from './FocusManager';

/**
 * Focuses destination via command execution.
 *
 * Used by:
 * - Chat assistants (Claude Code, Cursor AI, GitHub Copilot): Focus via extension commands
 */
export class CommandFocusManager implements FocusManager {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly commands: string[],
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<void> {
    for (const command of this.commands) {
      try {
        await this.ideAdapter.executeCommand(command);
        this.logger.debug({ ...context, command }, 'Focus command succeeded');
        return;
      } catch (error) {
        this.logger.debug({ ...context, command, error }, 'Focus command failed, trying next');
      }
    }

    this.logger.warn({ ...context, allCommandsFailed: true }, 'All focus commands failed');
  }
}
