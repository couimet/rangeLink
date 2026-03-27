import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusTier } from '../types';

import { FocusErrorReason, type FocusCapability, type FocusResult } from './FocusCapability';

/**
 * FocusCapability for custom AI assistant destinations with tiered command support.
 *
 * Tries tiers in priority order (Tier 1 → Tier 2 → Tier 3). Within each tier,
 * tries commands sequentially. The first successful command determines which
 * InsertFactory is used for text delivery.
 *
 * Tier 1 (insertCommands): Direct text delivery via command argument
 * Tier 2 (focusAndPasteCommands): Focus + auto-paste via clipboard
 * Tier 3 (focusCommands): Focus only, user pastes manually
 */
export class TieredFocusCapability implements FocusCapability {
  /**
   * The label of the tier that last succeeded in focus().
   * Used by getUserInstruction to determine toast behavior.
   */
  lastTierLabel: string | undefined;

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly tiers: readonly FocusTier[],
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    this.lastTierLabel = undefined;

    for (const tier of this.tiers) {
      if (tier.commands.length === 0) {
        continue;
      }

      for (const command of tier.commands) {
        try {
          await this.ideAdapter.executeCommand(command);
          this.logger.debug(
            { ...context, command, tier: tier.label },
            `Focus command succeeded (${tier.label})`,
          );

          this.lastTierLabel = tier.label;
          return Result.ok({
            inserter: tier.insertFactory.forTarget(),
          });
        } catch (error) {
          this.logger.debug(
            { ...context, command, tier: tier.label, error },
            'Focus command failed, trying next',
          );
        }
      }

      this.logger.debug(
        { ...context, tier: tier.label },
        `All commands failed for ${tier.label}, trying next tier`,
      );
    }

    this.logger.warn({ ...context, allTiersFailed: true }, 'All tiers exhausted — focus failed');
    return Result.err({
      reason: FocusErrorReason.COMMAND_FOCUS_FAILED,
    });
  }
}
