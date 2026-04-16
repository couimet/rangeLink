import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusTier, FocusTierLabel } from '../types';

import { FocusErrorReason, type FocusCapability, type FocusResult } from './FocusCapability';

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
      this.logger.debug(
        { ...context, tier: resolvedTier.label },
        `Resolved tier ${resolvedTier.label} — returning inserter directly`,
      );
      return Result.ok({
        inserter: resolvedTier.insertFactory.forTarget(),
      });
    }

    for (const command of resolvedTier.commands) {
      try {
        await this.ideAdapter.executeCommand(command);
        this.logger.debug(
          { ...context, command, tier: resolvedTier.label },
          `Focus command succeeded (${resolvedTier.label})`,
        );
        return Result.ok({
          inserter: resolvedTier.insertFactory.forTarget(),
        });
      } catch (error) {
        this.logger.debug(
          { ...context, command, tier: resolvedTier.label, error },
          'Focus command failed, trying next',
        );
      }
    }

    this.logger.warn(
      { ...context, tier: resolvedTier.label, allCommandsFailed: true },
      `All focus commands failed for resolved tier ${resolvedTier.label}`,
    );
    return Result.err({
      reason: FocusErrorReason.COMMAND_FOCUS_FAILED,
    });
  }
}
