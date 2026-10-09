import { DEFAULT_CASE_POLICY } from '../constants/textFragmentMatch';
import type { TextFragmentCasePolicy } from '../types/TextFragmentCasePolicy';
import type { TextFragmentMatchOutcome } from '../types/TextFragmentMatchOutcome';
import type { TextFragmentMatchSettings } from '../types/TextFragmentMatchSettings';

import {
  type CaseSensitivity,
  type MatchCandidate,
  resolveTextFragmentMatch,
  type TextDirective,
  TextFragmentResult,
  type TextMatchOptions,
} from 'text-fragment-ts';

/**
 * One search run at one case sensitivity.
 */
const runPass = (
  document: string,
  directive: TextDirective,
  options: TextMatchOptions,
  caseSensitivity: CaseSensitivity,
): TextFragmentResult<MatchCandidate[]> => resolveTextFragmentMatch(document, directive, { ...options, caseSensitivity });

/**
 * The search the case policy asks for.
 *
 * `prefer-sensitive` runs the exact-text pass first and stops there whenever it
 * produced candidates, so it can never widen a link that already resolved. It
 * retries without regard to case only when the first pass found nothing, which
 * is what makes it strictly better than either single pass: it adds matches a
 * case-sensitive search would miss and never adds choices to a search that was
 * already unambiguous.
 *
 * A failed pass is not an empty pass. A refusal means the search could not
 * finish within its bound, so retrying would only repeat the refusal, and the
 * failure travels back to the caller instead.
 */
const applyCasePolicy = (
  document: string,
  directive: TextDirective,
  options: TextMatchOptions,
  casePolicy: TextFragmentCasePolicy,
): TextFragmentResult<MatchCandidate[]> => {
  if (casePolicy === 'sensitive') {
    return runPass(document, directive, options, 'sensitive');
  }
  if (casePolicy === 'insensitive') {
    return runPass(document, directive, options, 'insensitive');
  }

  const exactPass = runPass(document, directive, options, 'sensitive');
  if (!exactPass.success || exactPass.value.length > 0) {
    return exactPass;
  }
  return runPass(document, directive, options, 'insensitive');
};

const toOutcome = (candidates: MatchCandidate[]): TextFragmentMatchOutcome => {
  const [first] = candidates;
  if (first === undefined) {
    return { status: 'not-found' };
  }
  if (candidates.length === 1) {
    return { status: 'matched', start: first.start, end: first.end };
  }
  return { status: 'ambiguous', candidates };
};

/**
 * Resolve a decoded text fragment directive against a document, under
 * RangeLink's policy.
 *
 * This is the layer's whole reason to exist: the codec package answers with
 * every place a directive matches and leaves the choice to the caller, and this
 * function turns that list into the decision RangeLink needs. One place is a
 * match, none is a miss, and several is a question for the reader rather than a
 * refusal, because the reader is the only one who knows which occurrence the
 * link meant.
 *
 * Settings are read per call, so a caller whose configuration changed can pass
 * the new values on its next call with no instance to rebuild. Anything the
 * settings omit takes RangeLink's shipped default, and everything they do not
 * mention keeps the codec package's browser-faithful default.
 *
 * The result fails only when the search cannot complete within its candidate
 * maximum, which is the one refusal left.
 */
export const matchTextFragmentInDocument = (
  document: string,
  directive: TextDirective,
  settings: TextFragmentMatchSettings = {},
): TextFragmentResult<TextFragmentMatchOutcome> => {
  const { casePolicy, ...options } = settings;

  const matched = applyCasePolicy(document, directive, options, casePolicy ?? DEFAULT_CASE_POLICY);
  if (!matched.success) {
    return TextFragmentResult.err(matched.error);
  }
  return TextFragmentResult.ok(toOutcome(matched.value));
};
