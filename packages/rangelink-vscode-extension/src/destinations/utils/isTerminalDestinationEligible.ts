import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

/**
 * Check if terminal destination is eligible for binding
 *
 * Terminal destination requires an active terminal.
 *
 * @param ideAdapter - IDE adapter for reading terminal state
 * @returns true if terminal destination can be bound
 */
export const isTerminalDestinationEligible = (ideAdapter: VscodeAdapter): boolean =>
  ideAdapter.activeTerminal !== undefined;
