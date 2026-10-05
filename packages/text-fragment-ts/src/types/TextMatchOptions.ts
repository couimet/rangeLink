import { BlockSpan } from './BlockSpan';
import { CaseSensitivity } from './CaseSensitivity';

/**
 * Caller-supplied settings for matching a directive against a document.
 *
 * Every field is optional and every default is the browser's answer, so an
 * empty object, or no object at all, selects browser behaviour. A host that
 * wants anything else states the difference here instead of holding its own
 * copy of the matcher.
 */
export interface TextMatchOptions {
  /** How text case is compared. Defaults to case-insensitive, as a browser does. */
  caseSensitivity?: CaseSensitivity;

  /**
   * Whether to collapse each run of whitespace to a single space before
   * matching. Defaults to true, which is what rendered text looks like.
   */
  collapseWhitespace?: boolean;

  /**
   * The document's blocks, in raw offsets. Defaults to none, which makes the
   * whole document one block and lets a term span any part of it.
   */
  blockSpans?: ReadonlyArray<BlockSpan>;

  /**
   * Stop collecting when more than this many places match. Defaults to
   * `DEFAULT_MAX_CANDIDATES`. The bound keeps a short term from walking a whole
   * document, and the error reports this limit rather than an exact count.
   */
  maxCandidates?: number;
}
