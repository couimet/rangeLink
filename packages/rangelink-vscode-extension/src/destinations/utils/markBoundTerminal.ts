import type { EligibleTerminal } from '../../types';

/**
 * Enrich eligible terminals with bound state by matching processId.
 *
 * Sets `boundState: 'bound'` on the terminal whose processId matches
 * the bound terminal's processId, and `'not-bound'` on all others.
 * If `boundTerminalProcessId` is undefined, all terminals get `'not-bound'`.
 *
 * @param terminals - Eligible terminals with processId already resolved
 * @param boundTerminalProcessId - processId of the currently bound terminal, or undefined
 * @returns New array with boundState set on every item
 */
export const markBoundTerminal = (
  terminals: readonly EligibleTerminal[],
  boundTerminalProcessId: number | undefined,
): EligibleTerminal[] =>
  terminals.map((t) => ({
    ...t,
    boundState:
      boundTerminalProcessId !== undefined &&
      t.processId !== undefined &&
      t.processId === boundTerminalProcessId
        ? ('bound' as const)
        : ('not-bound' as const),
  }));
