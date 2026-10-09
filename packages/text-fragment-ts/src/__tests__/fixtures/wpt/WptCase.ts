/**
 * Ported from web-platform-tests, which is distributed under the 3-Clause BSD
 * license. See the NOTICE file at the repository root.
 */

/**
 * The refusal a ported case expects, described field by field.
 *
 * The fields are stored rather than derived from the code, so a suite that
 * changes a message or a `details` payload fails here instead of following the
 * change silently.
 */
export interface WptRefusal {
  readonly code: string;
  readonly message: string;
  readonly functionName: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * What a ported case asks of the text-level matcher.
 *
 * The corpus observes a browser, which answers with a scroll position or a
 * highlighted element. These are the same answers expressed over a plain-text
 * document: where the first match starts, that nothing matched at all, or that
 * we refuse to read the fragment.
 */
export type WptMatchExpectation =
  { readonly kind: 'no-match' } | { readonly kind: 'match-in'; readonly block: string } | { readonly kind: 'refused'; readonly error: WptRefusal };

/**
 * What happened when a case met this implementation.
 *
 * `ported` cases run as tests against the text-level model. The other two are
 * recorded and skipped with their reason in the test title: `divergent` means
 * our model answers differently and the gap is deliberate, `not-applicable`
 * means the case turns on a rule that a plain-text document cannot carry.
 */
export type WptCaseOutcome =
  | { readonly status: 'ported'; readonly expectation: WptMatchExpectation }
  | { readonly status: 'divergent'; readonly reason: string }
  | { readonly status: 'not-applicable'; readonly reason: string };

/**
 * One case transcribed from the web-platform-tests corpus.
 */
export interface WptCase {
  /** Stable identifier, unique across the ported corpus. */
  readonly id: string;

  /** The corpus description, verbatim, and the title of the ported test. */
  readonly description: string;

  /** The fragment, verbatim, including its leading `#`. */
  readonly fragment: string;

  /** The spec step the corpus names in the comment above the case, when it names one. */
  readonly specStep?: string;

  /** What the case asks, and what happened when it met this implementation. */
  readonly outcome: WptCaseOutcome;

  /** Permanent link to the case in the web-platform-tests repository. */
  readonly permalink: string;
}
