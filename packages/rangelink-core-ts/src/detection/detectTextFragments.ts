import type { DetectedLink } from '../types/DetectedLink';
import { NO_WEB_URL_SCHEME, NOT_AFTER_URL_CHAR, PATH_CHAR } from '../utils/buildLinkPattern';

import { classifyOverlap } from './classifyOverlap';
import type { Cancellable, OccupiedRange } from './types';

import type { Logger } from '@couimet/logger-contract';
import { parseTextFragment, TEXT_FRAGMENT_DIRECTIVE } from 'text-fragment-ts';

/**
 * Value charset for the text fragment detection pattern.
 *
 * The encoder's raw set (encodeURIComponent unreserved: A-Z a-z 0-9 - _ . ! ~
 * * ' ( )) plus `%` for percent-escapes, plus `,` because commas structurally
 * separate directive terms (`[prefix-,]start[,end][,-suffix]`). Raw non-ASCII
 * is intentionally not matched — generated links always percent-encode it and
 * the lenient decoder still accepts raw octets when one slips through.
 *
 * The set holds every character prose can put after a link, so the pattern
 * cannot tell a value from the punctuation that surrounds it. The trailing
 * trim decides where the value ends.
 */
const TEXT_FRAGMENT_VALUE_CHAR = `[A-Za-z0-9\\-_.!~*'()%,]`;

/**
 * Regex for the unquoted text fragment pass.
 *
 * Mirrors buildLinkPattern's path framing: NOT_AFTER_URL_CHAR and
 * NO_WEB_URL_SCHEME keep web URLs from matching, PATH_CHAR defines the path.
 * A greedy value run extends to the end of the directive; candidate strings are
 * then validated whole by parseTextFragment, which rejects malformed values, so
 * the regex only proposes candidate spans.
 */
const UNQUOTED_TEXT_FRAGMENT_LINK_PATTERN = new RegExp(
  `${NOT_AFTER_URL_CHAR}${NO_WEB_URL_SCHEME}${PATH_CHAR}+?${TEXT_FRAGMENT_DIRECTIVE}${TEXT_FRAGMENT_VALUE_CHAR}+`,
  'g',
);

/**
 * Path charset for the quoted text fragment pass.
 *
 * Mirrors PATH_CHAR but admits whitespace, because a quoted link exists to
 * carry a path with a space. The quote characters come off the class so a
 * candidate cannot run past its own closing quote.
 */
const QUOTED_PATH_CHAR = '[^\\x60\\x22\\x27<>\\x5d\\n\\r]';

/**
 * Regex for the quoted text fragment pass.
 *
 * PATH_CHAR stops at a space, so the unquoted pass alone would start mid-path
 * on `'My Folder/file.ts:~:text=build'` and lose the first segment. The value
 * charset holds no whitespace, so the value run must reach the closing quote —
 * that constraint is what keeps an apostrophe pair in prose from pairing into a
 * fragment candidate.
 */
const QUOTED_TEXT_FRAGMENT_LINK_PATTERN = new RegExp(
  `(?<quote>['"])${NO_WEB_URL_SCHEME}${QUOTED_PATH_CHAR}+?${TEXT_FRAGMENT_DIRECTIVE}${TEXT_FRAGMENT_VALUE_CHAR}+\\k<quote>`,
  'g',
);

/**
 * Result of the text fragment detection pass.
 */
export interface TextFragmentDetectionResult {
  readonly links: DetectedLink[];
  readonly occupiedRanges: OccupiedRange[];
  readonly textFragmentCandidates: number;
  readonly parseFailures: number;
}

const LEADING_TRIM_CHARS = ['(', '[', '{', '<'];

const TRAILING_PERIOD = '.';

const countChar = (text: string, char: string): number => {
  let count = 0;
  for (const character of text) {
    if (character === char) count++;
  }
  return count;
};

/**
 * Take the prose punctuation off the end of a text fragment candidate.
 *
 * The value run is greedy, so it carries the surrounding punctuation into the
 * value. A closing paren comes off only while it outnumbers the opening parens,
 * so a term that balances its own parens keeps them. A trailing comma always
 * comes off: the split leaves an empty end term, so that candidate can never
 * parse and the removal loses nothing. One trailing period comes off, because
 * prose puts a period after a link.
 *
 * @param candidate - The candidate span, already trimmed at the front
 * @param firstValueIndex - Index in the candidate of the directive's first value character
 * @returns The candidate with its surrounding punctuation removed
 */
const stripTrailingProsePunctuation = (candidate: string, firstValueIndex: number): string => {
  let result = candidate;
  let periodStripped = false;

  for (;;) {
    const lastIndex = result.length - 1;

    // A value that is itself punctuation is a real search term, not a wrapper.
    if (lastIndex <= firstValueIndex) return result;

    const lastChar = result[lastIndex];

    if (lastChar === ')' && countChar(result, ')') > countChar(result, '(')) {
      result = result.slice(0, lastIndex);
    } else if (lastChar === ',') {
      result = result.slice(0, lastIndex);
    } else if (lastChar === TRAILING_PERIOD && !periodStripped) {
      result = result.slice(0, lastIndex);
      periodStripped = true;
    } else {
      return result;
    }
  }
};

/**
 * Detect text fragment links using the quoted and unquoted fragment patterns.
 *
 * The quoted pass runs first and claims the span of every quoted link,
 * including its quotes. The unquoted pass then skips any candidate that
 * overlaps a claimed span, so a quoted link never yields a second, briefer link
 * built from its inner text. Every candidate is validated whole by
 * parseTextFragment; matches that fail to parse are counted and logged.
 *
 * @param text - The text to scan
 * @param logger - Logger for debug output
 * @param token - Optional cancellation token
 * @returns Detection results with links, occupied ranges, and stats
 */
export const detectTextFragments = (text: string, logger: Logger, token?: Cancellable): TextFragmentDetectionResult => {
  const links: DetectedLink[] = [];
  const occupiedRanges: OccupiedRange[] = [];
  let parseFailures = 0;

  const recordCandidate = (linkText: string, startIndex: number, length: number, parseInput: string): void => {
    const parseResult = parseTextFragment(parseInput);
    if (!parseResult.success) {
      parseFailures++;
      logger.debug({ fn: 'detectTextFragments', link: parseInput, error: parseResult.error }, 'Skipping text fragment link that failed to parse');
      return;
    }

    links.push({ linkText, startIndex, length, parsed: parseResult.value });
    occupiedRanges.push({ start: startIndex, end: startIndex + length });
  };

  QUOTED_TEXT_FRAGMENT_LINK_PATTERN.lastIndex = 0;
  const quotedMatches = [...text.matchAll(QUOTED_TEXT_FRAGMENT_LINK_PATTERN)];

  for (const match of quotedMatches) {
    if (token?.isCancellationRequested) break;

    const quotedSpan = match[0];

    // parseTextFragment strips the surrounding quotes itself, and the link text
    // keeps the convention detectQuotedLinks sets: inner content, quoted range.
    recordCandidate(quotedSpan.slice(1, -1), match.index!, quotedSpan.length, quotedSpan);
  }

  UNQUOTED_TEXT_FRAGMENT_LINK_PATTERN.lastIndex = 0;
  const unquotedMatches = [...text.matchAll(UNQUOTED_TEXT_FRAGMENT_LINK_PATTERN)];

  for (const match of unquotedMatches) {
    if (token?.isCancellationRequested) break;

    let candidate = match[0];
    let candidateStartIndex = match.index!;

    // Trim leading punctuation that may surround the link in prose
    while (candidate.length > 0 && LEADING_TRIM_CHARS.includes(candidate[0])) {
      candidate = candidate.slice(1);
      candidateStartIndex++;
    }

    const firstValueIndex = candidate.indexOf(TEXT_FRAGMENT_DIRECTIVE) + TEXT_FRAGMENT_DIRECTIVE.length;
    candidate = stripTrailingProsePunctuation(candidate, firstValueIndex);

    const candidateEnd = candidateStartIndex + candidate.length;
    const overlap = classifyOverlap(candidateStartIndex, candidateEnd, occupiedRanges);
    if (overlap.type !== 'none') {
      logger.debug({ fn: 'detectTextFragments', link: candidate }, 'Skipping candidate already claimed by a quoted text fragment link');
      continue;
    }

    recordCandidate(candidate, candidateStartIndex, candidate.length, candidate);
  }

  return {
    links,
    occupiedRanges,
    textFragmentCandidates: quotedMatches.length + unquotedMatches.length,
    parseFailures,
  };
};
