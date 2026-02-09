import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { FocusErrorReason, type FocusCapability, type FocusResult } from './FocusCapability';
import type { InsertFactory } from './insertFactories';

/**
 * FocusCapability for AI assistant destinations.
 *
 * Executes focus commands to open the AI assistant panel.
 * Uses InsertFactory injection for decoupled clipboard-based paste.
 *
 * Used by: Claude Code, Cursor AI, GitHub Copilot Chat
 */
export class AIAssistantFocusCapability implements FocusCapability {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly focusCommands: string[],
    private readonly insertFactory: InsertFactory<void>,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    for (const command of this.focusCommands) {
      try {
        await this.ideAdapter.executeCommand(command);
        this.logger.debug({ ...context, command }, 'Focus command succeeded');

        return Result.ok({
          inserter: this.insertFactory.forTarget(),
        });
      } catch (error) {
        this.logger.debug({ ...context, command, error }, 'Focus command failed, trying next');
      }
    }

    this.logger.warn({ ...context, allCommandsFailed: true }, 'All focus commands failed');
    return Result.err({
      reason: FocusErrorReason.COMMAND_FOCUS_FAILED,
    });
  }
}
