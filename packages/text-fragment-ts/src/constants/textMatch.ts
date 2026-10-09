import { CaseSensitivity } from '../types/CaseSensitivity';

/**
 * Defaults for matching a directive against a document.
 *
 * Each default is the answer a browser gives when it follows a text fragment
 * link, so a caller that supplies no options gets browser behaviour.
 */

/** Browsers match text fragments without regard to case. */
export const DEFAULT_CASE_SENSITIVITY: CaseSensitivity = 'insensitive';

/** Browsers match against rendered text, where a whitespace run reads as one space. */
export const DEFAULT_COLLAPSE_WHITESPACE = true;

/**
 * Upper bound on the number of matches one call collects.
 *
 * The bound exists so a directive built from a single character cannot walk an
 * entire document. A caller that reaches it gets a `MATCH_TOO_MANY_CANDIDATES`
 * error naming this limit, because the exact count is unknown once collection
 * stops.
 */
export const DEFAULT_MAX_CANDIDATES = 10;
