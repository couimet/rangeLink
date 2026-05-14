import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';

import { FOCUS_TO_PASTE_DELAY_MS } from '../../constants/aiAssistantPasteConstants';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import type { ColdRefocusConfig } from './ColdRefocusConfig';
import { FocusErrorReason, type FocusCapability, type FocusResult } from './FocusCapability';
import type { InsertFactory } from './insertFactories';

/**
 * FocusCapability for AI assistant destinations.
 *
 * Executes focus commands to open the AI assistant panel.
 * On cold start (first focus after bind), re-fires focus commands
 * at intervals to keep the panel open while it initializes.
 * Uses InsertFactory injection for decoupled clipboard-based paste.
 *
 * Used by: Claude Code, Cursor AI, GitHub Copilot Chat
 */
export class AIAssistantFocusCapability implements FocusCapability {
  private panelIsWarm = false;

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly focusCommands: string[],
    private readonly getColdRefocus: (() => ColdRefocusConfig) | undefined,
    private readonly insertFactory: InsertFactory<void>,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    for (const command of this.focusCommands) {
      try {
        await this.ideAdapter.executeCommand(command);
        this.logger.debug({ ...context, command }, 'Focus command succeeded');

        const coldRefocus = this.getColdRefocus?.();

        if (!this.panelIsWarm && coldRefocus) {
          await this.refocusDuring(context, coldRefocus);
        } else {
          await new Promise<void>((resolve) => setTimeout(resolve, FOCUS_TO_PASTE_DELAY_MS));
        }

        this.panelIsWarm = true;

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

  private async refocusDuring(context: LoggingContext, refocus: ColdRefocusConfig): Promise<void> {
    if (refocus.totalMs <= 0 || refocus.intervalMs <= 0) {
      this.logger.warn(
        { ...context, totalMs: refocus.totalMs, intervalMs: refocus.intervalMs },
        'Invalid cold refocus config, falling back to warm delay',
      );
      await new Promise<void>((resolve) => setTimeout(resolve, FOCUS_TO_PASTE_DELAY_MS));
      return;
    }

    const start = Date.now();
    let elapsed = 0;

    while (elapsed < refocus.totalMs) {
      const waitMs = Math.min(refocus.intervalMs, refocus.totalMs - elapsed);
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      elapsed += waitMs;

      if (elapsed >= refocus.totalMs) {
        break;
      }

      for (const command of this.focusCommands) {
        try {
          await this.ideAdapter.executeCommand(command);
          break;
        } catch {
          // try next command
        }
      }
    }

    this.logger.debug(
      { ...context, totalMs: Date.now() - start, intervalMs: refocus.intervalMs },
      'Cold refocus loop completed',
    );
  }
}
