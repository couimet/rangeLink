import type { OccupiedRange } from './types';

/**
 * Result of classifying how a candidate range overlaps with occupied ranges.
 *
 * - 'none': No overlap with any occupied range — safe to add
 * - 'partial': Candidate partially overlaps an occupied range — skip
 * - 'encompassing': Candidate fully wraps one or more occupied ranges — replace them
 */
export type OverlapClassification =
  | { readonly type: 'none' }
  | { readonly type: 'partial' }
  | { readonly type: 'encompassing'; readonly encompassedIndices: number[] };

/**
 * Classify how a candidate range overlaps with existing occupied ranges.
 *
 * Three outcomes:
 * - No overlap: the candidate doesn't touch any existing range
 * - Partial overlap: the candidate partially covers an existing range (skip it)
 * - Encompassing: the candidate fully wraps one or more existing ranges (replace them)
 *
 * Returns 'partial' immediately on first partial overlap, even if earlier ranges
 * were fully encompassed — partial overlap always wins.
 *
 * @param candidateStart - Start index of the candidate range
 * @param candidateEnd - End index of the candidate range
 * @param occupiedRanges - Array of already-occupied ranges
 * @returns Classification result
 */
export const classifyOverlap = (
  candidateStart: number,
  candidateEnd: number,
  occupiedRanges: readonly OccupiedRange[],
): OverlapClassification => {
  const encompassedIndices: number[] = [];

  for (let i = 0; i < occupiedRanges.length; i++) {
    const r = occupiedRanges[i];
    const overlaps = candidateStart < r.end && candidateEnd > r.start;

    if (overlaps) {
      if (candidateStart <= r.start && candidateEnd >= r.end) {
        encompassedIndices.push(i);
      } else {
        return { type: 'partial' };
      }
    }
  }

  if (encompassedIndices.length > 0) {
    return { type: 'encompassing', encompassedIndices };
  }

  return { type: 'none' };
};
