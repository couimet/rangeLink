import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusTier, FocusTierLabel } from '../types';

import { type FocusCapability, FocusErrorReason, FocusResult } from './FocusCapability';

import type { Logger, LoggingContext } from '@couimet/logger-contract';

/**
 * FocusCapability for a single resolved tier.
 *
 * Created after bind-time resolution has determined which tier's commands
 * are available. Holds only the winning tier — no tier iteration at focus time.
 *
 * Behavior depends on the tier's probeMode:
 * - 'none' (Tier 1): Returns the inserter directly. The inserter itself calls
 *   executeCommand with text arguments — no focus step needed.
 * - 'execute' (Tier 2/3): Calls executeCommand on focus commands to open
 *   the AI panel, then returns the inserter for clipboard-based paste.
 */
export class ResolvedFocusCapability implements FocusCapability {
  /**
   * The label of the resolved tier. Used by getUserInstruction and
   * shouldPreserveClipboard to make tier-dependent decisions.
   */
  readonly resolvedTierLabel: FocusTierLabel;

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly resolvedTier: FocusTier,
    private readonly logger: Logger,
  ) {
    this.resolvedTierLabel = resolvedTier.label;
  }

  async focus(context: LoggingContext): Promise<FocusResult> {
    const { resolvedTier } = this;

    if (resolvedTier.probeMode === 'none') {
      this.logger.debug({ ...context, tier: resolvedTier.label }, `Resolved tier ${resolvedTier.label} — returning inserter directly`);
      return FocusResult.ok({
        inserter: resolvedTier.insertFactory.forTarget(),
      });
    }

    for (const stage of resolvedTier.commands) {
      if (stage.length === 0) {
        // An empty stage must not count as success (skips later fallback stages).
        continue;
      }
      let stageSucceeded = true;
      for (const command of stage) {
        try {
          await this.ideAdapter.executeCommand(command);
          this.logger.debug({ ...context, command, tier: resolvedTier.label }, `Focus command succeeded (${resolvedTier.label})`);
        } catch (error) {
          this.logger.debug({ ...context, command, tier: resolvedTier.label, error }, 'Focus command failed, trying next stage');
          stageSucceeded = false;
          break;
        }
      }
      if (stageSucceeded) {
        return FocusResult.ok({
          inserter: resolvedTier.insertFactory.forTarget(),
        });
      }
    }

    this.logger.warn({ ...context, tier: resolvedTier.label, allStagesFailed: true }, `All focus stages failed for resolved tier ${resolvedTier.label}`);
    return FocusResult.err({
      reason: FocusErrorReason.COMMAND_FOCUS_FAILED,
    });
  }
}
