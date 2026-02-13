import type { EligibleTerminal } from '../../types';

/**
 * Sort eligible terminals by priority: bound first, then active, then natural order.
 *
 * Uses explicit `=== 'bound'` check — `'not-bound'` and `undefined` are correctly
 * treated identically (both rank 1). Returns a new array; does not mutate input.
 *
 * @param terminals - Eligible terminals to sort (may or may not have boundState set)
 * @returns New sorted array
 */
export const sortEligibleTerminals = (terminals: readonly EligibleTerminal[]): EligibleTerminal[] =>
  [...terminals].sort((a, b) => {
    const aBound = a.boundState === 'bound' ? 0 : 1;
    const bBound = b.boundState === 'bound' ? 0 : 1;
    if (aBound !== bBound) return aBound - bBound;
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return 0;
  });
