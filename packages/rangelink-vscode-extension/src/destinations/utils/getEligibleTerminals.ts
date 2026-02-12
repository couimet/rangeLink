import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { EligibleTerminal } from '../../types';

import { isTerminalEligible } from './isTerminalEligible';

/**
 * Get all terminals eligible for binding with their metadata.
 *
 * Filters out terminals with terminated processes (exitStatus defined).
 * Returns terminals sorted with the active terminal first, preserving
 * VS Code's order for the remaining terminals.
 *
 * @param ideAdapter - IDE adapter for reading terminal state
 * @returns Array of eligible terminals (empty if none are live), active first
 */
export const getEligibleTerminals = (ideAdapter: VscodeAdapter): EligibleTerminal[] => {
  const allTerminals = ideAdapter.terminals;

  const liveTerminals = allTerminals.filter(isTerminalEligible);

  if (liveTerminals.length === 0) {
    return [];
  }
  const activeTerminal = ideAdapter.activeTerminal;

  return liveTerminals
    .map((terminal) => ({
      terminal,
      name: terminal.name,
      isActive: terminal === activeTerminal,
    }))
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
};
