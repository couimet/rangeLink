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
 * A single sequence of focus commands that must ALL run, in order.
 *
 * Stages express an AND group: the commands in one stage are a prerequisite
 * plus action (e.g., Cline needs `claude-dev.SidebarProvider.focus` to ensure
 * the panel exists, then `cline.focusChatInput` to focus the input). A stage
 * succeeds only when every command in it resolves; any throw fails the stage.
 */
export type FocusStage = readonly string[];

/**
 * Ordered fallback of focus stages — an OR of ANDs.
 *
 * Focus strategies try each stage in order and stop at the first stage whose
 * commands all resolve. The flat fallback-chain behavior is the degenerate
 * case where every stage holds a single command.
 */
export type FocusStages = readonly FocusStage[];

/**
 * Known tier labels assigned in FocusCapabilityFactory.
 *
 * Used to make tier-dependent decisions type-safe (e.g., clipboard
 * preservation checks compare against this union, not raw strings).
 */
export type FocusTierLabel = 'insertCommands' | 'focusAndPasteCommands' | 'focusCommands' | 'builtinFallback';

/**
 * A tier in the tiered focus strategy.
 *
 * Each tier pairs a set of VS Code focus stages with an InsertFactory that
 * determines how text is delivered after focus succeeds.
 */
export interface FocusTier {
  readonly commands: FocusStages;
  readonly insertFactory: InsertFactory<void>;
  readonly label: FocusTierLabel;
  readonly probeMode: FocusTierProbeMode;
}
