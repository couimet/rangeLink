import type { MatchCandidate } from 'text-fragment-ts';

/**
 * What one matching attempt settled on.
 *
 * The three variants are the whole decision surface a caller needs: one place
 * to go to, nowhere to go, or several places to choose from. A match is the one
 * candidate it settled on, so `matched` and a candidate carry the same two raw
 * document offsets.
 *
 * A refusal is not a variant. A search that cannot finish within its candidate
 * maximum fails the enclosing result instead, because a truncated list would
 * look like a short list of choices rather than a missing one.
 */
export type TextFragmentMatchOutcome =
  ({ status: 'matched' } & MatchCandidate) | { status: 'not-found' } | { status: 'ambiguous'; candidates: MatchCandidate[] };
