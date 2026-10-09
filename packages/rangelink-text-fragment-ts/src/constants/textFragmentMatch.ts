import type { TextFragmentCasePolicy } from '../types/TextFragmentCasePolicy';

/**
 * RangeLink's case policy: match the text as written, and widen to other
 * case variants only when the exact text matches nowhere.
 */
export const DEFAULT_CASE_POLICY: TextFragmentCasePolicy = 'prefer-sensitive';
