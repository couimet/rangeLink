import { parseLink } from '../parsing/parseLink';
import type { DelimiterConfig } from '../types/DelimiterConfig';
import type { DetectedLink } from '../types/DetectedLink';

import { classifyOverlap } from './classifyOverlap';
import type { Cancellable, OccupiedRange } from './types';

import type { Logger } from '@couimet/logger-contract';

/**
 * Result of the unquoted detection pass.
 */
export interface UnquotedDetectionResult {
  readonly links: DetectedLink[];
  readonly occupiedRanges: OccupiedRange[];
  readonly unquotedMatches: number;
  readonly parseFailures: number;
}

/**
 * Detect unquoted RangeLinks using the standard regex pattern.
 *
 * Runs buildLinkPattern's regex against the text and validates each match
 * via parseLink. Matches that fail to parse are counted and logged. Matches
 * overlapping a range already claimed by the text fragment pass are skipped —
 * the text fragment pass owns those spans.
 *
 * @param text - The text to scan
 * @param pattern - Compiled regex from buildLinkPattern
 * @param delimiters - Delimiter config for parseLink
 * @param occupiedRanges - Ranges already claimed by an earlier pass (text fragment links)
 * @param logger - Logger for debug output
 * @param token - Optional cancellation token
 * @returns Detection results with links, occupied ranges, and stats
 */
export const detectUnquotedLinks = (
  text: string,
  pattern: RegExp,
  delimiters: DelimiterConfig,
  occupiedRanges: readonly OccupiedRange[],
  logger: Logger,
  token?: Cancellable,
): UnquotedDetectionResult => {
  const links: DetectedLink[] = [];
  const ownRanges: OccupiedRange[] = [];
  let parseFailures = 0;

  pattern.lastIndex = 0;
  const matches = [...text.matchAll(pattern)];

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

    const overlap = classifyOverlap(trimmedStartIndex, trimmedStartIndex + trimmedLength, occupiedRanges);
    if (overlap.type !== 'none') {
      logger.debug({ fn: 'detectUnquotedLinks', link: trimmedMatch }, 'Skipping match already claimed by a text fragment link');
      continue;
    }

    const parseResult = parseLink(trimmedMatch, delimiters);
    if (!parseResult.success) {
      parseFailures++;
      logger.debug({ fn: 'detectUnquotedLinks', link: trimmedMatch, error: parseResult.error }, 'Skipping link that failed to parse');
      continue;
    }

    links.push({
      linkText: trimmedMatch,
      startIndex: trimmedStartIndex,
      length: trimmedLength,
      parsed: parseResult.value,
    });

    ownRanges.push({ start: trimmedStartIndex, end: trimmedStartIndex + trimmedLength });
  }

  return { links, occupiedRanges: ownRanges, unquotedMatches: matches.length, parseFailures };
};
