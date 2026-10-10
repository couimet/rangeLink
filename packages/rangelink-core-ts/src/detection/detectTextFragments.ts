import type { DetectedLink } from '../types/DetectedLink';
import { NO_WEB_URL_SCHEME, NOT_AFTER_URL_CHAR, PATH_CHAR } from '../utils/buildLinkPattern';

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
const TEXT_FRAGMENT_LINK_PATTERN = new RegExp(
  `${NOT_AFTER_URL_CHAR}${NO_WEB_URL_SCHEME}${PATH_CHAR}+?${TEXT_FRAGMENT_DIRECTIVE}${TEXT_FRAGMENT_VALUE_CHAR}+`,
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

/**
 * Detect unquoted text fragment links using the text fragment regex pattern.
 *
 * Runs TEXT_FRAGMENT_LINK_PATTERN against the text and validates each candidate
 * via parseTextFragment. Matches that fail to parse are counted and logged.
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

  TEXT_FRAGMENT_LINK_PATTERN.lastIndex = 0;
  const matches = [...text.matchAll(TEXT_FRAGMENT_LINK_PATTERN)];

  const LEADING_TRIM_CHARS = ['(', '[', '{', '<'];

  for (const match of matches) {
    if (token?.isCancellationRequested) break;

    const fullMatch = match[0];
    const startIndex = match.index!;
    const length = fullMatch.length;

    // Trim leading punctuation that may surround the link in prose
    let trimmedMatch = fullMatch;
    let trimmedStartIndex = startIndex;
    let trimmedLength = length;

    while (trimmedLength > 0 && LEADING_TRIM_CHARS.includes(trimmedMatch[0])) {
      trimmedMatch = trimmedMatch.slice(1);
      trimmedStartIndex++;
      trimmedLength--;
    }

    const parseResult = parseTextFragment(trimmedMatch);
    if (!parseResult.success) {
      parseFailures++;
      logger.debug({ fn: 'detectTextFragments', link: trimmedMatch, error: parseResult.error }, 'Skipping text fragment link that failed to parse');
      continue;
    }

    links.push({
      linkText: trimmedMatch,
      startIndex: trimmedStartIndex,
      length: trimmedLength,
      parsed: parseResult.value,
    });

    occupiedRanges.push({ start: trimmedStartIndex, end: trimmedStartIndex + trimmedLength });
  }

  return { links, occupiedRanges, textFragmentCandidates: matches.length, parseFailures };
};
