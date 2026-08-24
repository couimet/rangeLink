import { FOCUS_TO_PASTE_DELAY_MS } from '../../constants/aiAssistantPasteConstants';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusStages } from '../types';

import type { ColdRefocusConfig } from './ColdRefocusConfig';
import { type FocusCapability, FocusErrorReason, FocusResult } from './FocusCapability';
import type { InsertFactory } from './insertFactories';

import type { Logger, LoggingContext } from '@couimet/logger-contract';

/**
 * FocusCapability for AI assistant destinations.
 *
 * Executes focus stages (OR of ANDs) to open the AI assistant panel. Each
 * stage is a sequence of commands that must all run; focus advances to the
 * next stage only when a command in the current stage throws. This models
 * both simple fallback chains (single-command stages) and prerequisite-plus-
 * action sequences (e.g., Cline: open the sidebar, then focus its input).
 * On cold start (first focus after bind), re-fires the stages at intervals
 * to keep the panel open while it initializes.
 * Uses InsertFactory injection for decoupled clipboard-based paste.
 *
 * Used by: Claude Code, Cline, Gemini Code Assist, Cursor AI, GitHub Copilot Chat
 */
export class AIAssistantFocusCapability implements FocusCapability {
  private panelIsWarm = false;

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly focusStages: FocusStages,
    private readonly getColdRefocus: (() => ColdRefocusConfig) | undefined,
    private readonly insertFactory: InsertFactory<void>,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    const stageSucceeded = await this.tryRunStages(context);

    if (!stageSucceeded) {
      this.logger.warn({ ...context, allStagesFailed: true }, 'All focus stages failed');
      return FocusResult.err({
        reason: FocusErrorReason.COMMAND_FOCUS_FAILED,
      });
    }

    const coldRefocus = this.getColdRefocus?.();

    if (!this.panelIsWarm && coldRefocus) {
      await this.refocusDuring(context, coldRefocus);
    } else {
      await new Promise<void>((resolve) => setTimeout(resolve, FOCUS_TO_PASTE_DELAY_MS));
    }

    this.panelIsWarm = true;

    return FocusResult.ok({
      inserter: this.insertFactory.forTarget(),
    });
  }

  private async tryRunStages(context: LoggingContext): Promise<boolean> {
    for (const stage of this.focusStages) {
      let stageSucceeded = true;
      for (const command of stage) {
        try {
          await this.ideAdapter.executeCommand(command);
          this.logger.debug({ ...context, command, stage }, 'Focus command succeeded');
        } catch (error) {
          this.logger.debug({ ...context, command, stage, error }, 'Focus command failed, trying next stage');
          stageSucceeded = false;
          break;
        }
      }
      if (stageSucceeded) {
        return true;
      }
    }
    return false;
  }

  private async refocusDuring(context: LoggingContext, refocus: ColdRefocusConfig): Promise<void> {
    if (refocus.totalMs <= 0 || refocus.intervalMs <= 0 || refocus.totalMs <= refocus.intervalMs) {
      this.logger.warn({ ...context, totalMs: refocus.totalMs, intervalMs: refocus.intervalMs }, 'Invalid cold refocus config, falling back to warm delay');
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

      await this.tryRunStages(context);
    }

    this.logger.debug({ ...context, totalMs: Date.now() - start, intervalMs: refocus.intervalMs }, 'Cold refocus loop completed');
  }
}
