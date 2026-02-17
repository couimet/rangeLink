import type { EligibleFile } from '../../types';

/**
 * Sort eligible files by priority: bound first, then current-in-group, then alphabetical.
 *
 * Uses explicit `=== 'bound'` check — `'not-bound'` and `undefined` are correctly
 * treated identically (both rank 1). Returns a new array; does not mutate input.
 *
 * @param files - Eligible files to sort (may or may not have boundState set)
 * @returns New sorted array
 */
export const sortEligibleFiles = (files: readonly EligibleFile[]): EligibleFile[] =>
  [...files].sort((a, b) => {
    const aBound = a.boundState === 'bound' ? 0 : 1;
    const bBound = b.boundState === 'bound' ? 0 : 1;
    if (aBound !== bBound) return aBound - bBound;
    if (a.isCurrentInGroup !== b.isCurrentInGroup) return a.isCurrentInGroup ? -1 : 1;
    return a.filename.localeCompare(b.filename);
  });
