import type { Logger } from 'barebone-logger';

import type { FocusTier } from '../types';

/**
 * Result of tier resolution — the winning tier plus metadata about
 * which tiers were checked and why they were skipped.
 */
export interface TierResolutionResult {
  readonly resolvedTier: FocusTier;
  readonly isFallback: boolean;
}

/**
 * Resolve which focus tier to use by checking command registration.
 *
 * Walks tiers in priority order and returns the first tier that has at least
 * one command registered in the IDE. Called once at bind time (or on first
 * focus if the builder is synchronous).
 *
 * @param tiers - Ordered list of focus tiers (highest priority first)
 * @param registeredCommands - Commands currently registered in the IDE
 * @param logger - Logger for resolution diagnostics
 * @param logPrefix - Prefix for log messages (e.g., assistant name)
 * @param fallbackTierIndex - Index at or after which tiers are considered fallback
 * @returns The winning tier with fallback flag, or undefined if no tier has registered commands
 */
export const resolveFocusTier = (
  tiers: readonly FocusTier[],
  registeredCommands: readonly string[],
  logger: Logger,
  logPrefix: string,
  fallbackTierIndex: number = tiers.length,
): TierResolutionResult | undefined => {
  const fn = 'resolveFocusTier';
  const commandSet = new Set(registeredCommands);

  for (const [index, tier] of tiers.entries()) {
    if (tier.commands.length === 0) {
      continue;
    }

    const registeredCommand = tier.commands.find((cmd) => commandSet.has(cmd));

    if (registeredCommand) {
      const isFallback = index >= fallbackTierIndex;

      logger.debug(
        { fn, tier: tier.label, command: registeredCommand, isFallback, logPrefix },
        `${logPrefix}: resolved to ${tier.label} (command: ${registeredCommand})${isFallback ? ' [fallback]' : ''}`,
      );

      return { resolvedTier: tier, isFallback };
    }

    logger.debug(
      { fn, tier: tier.label, checkedCommands: tier.commands, logPrefix },
      `${logPrefix}: no registered commands for ${tier.label}, trying next tier`,
    );
  }

  logger.warn(
    { fn, logPrefix, tierCount: tiers.length },
    `${logPrefix}: no tiers have registered commands — resolution failed`,
  );
  return undefined;
};
