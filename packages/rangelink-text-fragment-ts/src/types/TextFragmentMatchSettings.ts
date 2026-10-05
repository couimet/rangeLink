import type { TextFragmentCasePolicy } from './TextFragmentCasePolicy';

import type { TextMatchOptions } from 'text-fragment-ts';

/**
 * RangeLink's policy for one matching call.
 *
 * Every field is optional, so a caller that supplies nothing gets the policy
 * RangeLink ships and a caller can override one axis without restating the
 * rest. The settings are read per call rather than held on an instance, which
 * is what lets a caller whose configuration changed mid-session pass the new
 * values on the next link with no rebuild.
 *
 * The axes that pass through to the codec are the codec's own, taken from its
 * options object rather than restated here, so the two cannot drift and a
 * setting the codec gains reaches this layer's callers. Only the case axis
 * differs: RangeLink reads case as one policy with a fallback rather than as
 * one of the codec's two fixed passes.
 */
export type TextFragmentMatchSettings = Omit<TextMatchOptions, 'caseSensitivity'> & {
  /**
   * Letter-case policy. Defaults to `prefer-sensitive`.
   */
  casePolicy?: TextFragmentCasePolicy;
};
