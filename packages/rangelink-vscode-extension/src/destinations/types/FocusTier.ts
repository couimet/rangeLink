import type { InsertFactory } from '../capabilities/insertFactories';

/**
 * Probe mode determines how a tier's availability is checked during resolution.
 *
 * - 'none': Check command registration via getCommands() only. Used by Tier 1
 *   (insertCommands) where executing the command would trigger side effects.
 *   When resolved, focus() returns the inserter directly without executeCommand.
 *
 * - 'execute': Check command registration via getCommands(), and when resolved,
 *   focus() calls executeCommand to focus the panel before returning the inserter.
 *   Used by Tier 2 (focusAndPasteCommands) and Tier 3 (focusCommands).
 */
export type FocusTierProbeMode = 'execute' | 'none';

/**
 * Known tier labels assigned in FocusCapabilityFactory.
 *
 * Used to make tier-dependent decisions type-safe (e.g., clipboard
 * preservation checks compare against this union, not raw strings).
 */
export type FocusTierLabel =
  | 'insertCommands'
  | 'focusAndPasteCommands'
  | 'focusCommands'
  | 'builtinFallback';

/**
 * A tier in the tiered focus strategy.
 *
 * Each tier pairs a set of VS Code commands with an InsertFactory that
 * determines how text is delivered after focus succeeds.
 */
export interface FocusTier {
  readonly commands: readonly string[];
  readonly insertFactory: InsertFactory<void>;
  readonly label: FocusTierLabel;
  readonly probeMode: FocusTierProbeMode;
}
