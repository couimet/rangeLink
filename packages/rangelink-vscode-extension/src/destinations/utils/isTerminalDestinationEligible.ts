import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

/**
 * Information about an eligible terminal.
 */
export interface EligibleTerminal {
  readonly terminal: vscode.Terminal;
  readonly name: string;
  readonly isActive: boolean;
}

/**
 * Result of checking terminal destination eligibility.
 */
export interface TerminalEligibility {
  readonly eligible: boolean;
  readonly terminals: readonly EligibleTerminal[];
}

/**
 * Check which terminals are eligible for binding.
 *
 * Returns all available terminals with their names and active status.
 * Eligibility requires at least one terminal to exist.
 *
 * @param ideAdapter - IDE adapter for reading terminal state
 * @returns Eligibility result with array of terminals when eligible
 */
export const isTerminalDestinationEligible = (ideAdapter: VscodeAdapter): TerminalEligibility => {
  const allTerminals = ideAdapter.terminals;
  const activeTerminal = ideAdapter.activeTerminal;

  if (allTerminals.length === 0) {
    return { eligible: false, terminals: [] };
  }

  const terminals: EligibleTerminal[] = allTerminals.map((terminal) => ({
    terminal,
    name: terminal.name,
    isActive: terminal === activeTerminal,
  }));

  return { eligible: true, terminals };
};
