import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

/**
 * Result of checking terminal destination eligibility.
 */
export interface TerminalEligibility {
  readonly eligible: boolean;
  readonly terminalName: string | undefined;
}

/**
 * Get terminal destination eligibility for binding.
 *
 * Terminal destination requires an active terminal.
 *
 * @param ideAdapter - IDE adapter for reading terminal state
 * @returns Eligibility result with terminalName when eligible
 */
export const getTerminalDestinationEligibility = (
  ideAdapter: VscodeAdapter,
): TerminalEligibility => {
  const activeTerminal = ideAdapter.activeTerminal;
  const eligible = activeTerminal !== undefined;

  const terminalName = eligible ? activeTerminal.name : undefined;

  return { eligible, terminalName };
};
