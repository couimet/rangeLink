import type * as vscode from 'vscode';

/**
 * Whether a terminal is the currently bound paste destination.
 * String union instead of boolean — both values are truthy, forcing explicit
 * `=== 'bound'` checks and avoiding JavaScript's falsy trap where `false`
 * and `undefined` are indistinguishable in conditionals and sort comparisons.
 *
 * - `'bound'` — this terminal is the bound paste destination
 * - `'not-bound'` — explicitly not the bound terminal
 * - `undefined` (absent) — not yet enriched by `markBoundTerminal`
 */
export type TerminalBoundState = 'bound' | 'not-bound';

/**
 * Information about a terminal eligible for binding.
 * Includes the raw terminal reference, display name, active state,
 * resolved processId, and optional bound state.
 */
export interface EligibleTerminal {
  readonly terminal: vscode.Terminal;
  readonly name: string;
  readonly isActive: boolean;
  readonly processId?: number;
  readonly boundState?: TerminalBoundState;
}
