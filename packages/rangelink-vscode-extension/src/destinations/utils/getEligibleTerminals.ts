import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { EligibleTerminal } from '../../types';

import { isTerminalEligible } from './isTerminalEligible';

/**
 * Get all terminals eligible for binding with their metadata.
 *
 * Filters out terminals with terminated processes (exitStatus defined).
 * Resolves processId for each terminal (used by bound-terminal enrichment).
 * Returns terminals in VS Code's natural order — sorting is a separate concern.
 *
 * @param ideAdapter - IDE adapter for reading terminal state
 * @returns Array of eligible terminals (empty if none are live)
 */
export const getEligibleTerminals = async (
  ideAdapter: VscodeAdapter,
): Promise<EligibleTerminal[]> => {
  const allTerminals = ideAdapter.terminals;

  const liveTerminals = allTerminals.filter(isTerminalEligible);

  if (liveTerminals.length === 0) {
    return [];
  }
  const activeTerminal = ideAdapter.activeTerminal;

  return Promise.all(
    liveTerminals.map(async (terminal) => ({
      terminal,
      name: terminal.name,
      isActive: terminal === activeTerminal,
      processId: (await terminal.processId) ?? undefined,
    })),
  );
};
