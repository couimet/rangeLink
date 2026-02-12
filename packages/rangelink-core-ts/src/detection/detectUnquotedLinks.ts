import type { Logger } from 'barebone-logger';

import { parseLink } from '../parsing/parseLink';
import type { DelimiterConfig } from '../types/DelimiterConfig';
import type { DetectedLink } from '../types/DetectedLink';

import type { Cancellable, OccupiedRange } from './types';

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
 * via parseLink. Matches that fail to parse are counted and logged.
 *
 * @param text - The text to scan
 * @param pattern - Compiled regex from buildLinkPattern
 * @param delimiters - Delimiter config for parseLink
 * @param logger - Logger for debug output
 * @param token - Optional cancellation token
 * @returns Detection results with links, occupied ranges, and stats
 */
export const detectUnquotedLinks = (
  text: string,
  pattern: RegExp,
  delimiters: DelimiterConfig,
  logger: Logger,
  token?: Cancellable,
): UnquotedDetectionResult => {
  const links: DetectedLink[] = [];
  const occupiedRanges: OccupiedRange[] = [];
  let parseFailures = 0;

  pattern.lastIndex = 0;
  const matches = [...text.matchAll(pattern)];

  for (const match of matches) {
    if (token?.isCancellationRequested) break;

    const fullMatch = match[0];
    const startIndex = match.index!;
    const length = fullMatch.length;

    const parseResult = parseLink(fullMatch, delimiters);
    if (!parseResult.success) {
      parseFailures++;
      logger.debug(
        { fn: 'detectUnquotedLinks', link: fullMatch, error: parseResult.error },
        'Skipping link that failed to parse',
      );
      continue;
    }

    links.push({
      linkText: fullMatch,
      startIndex,
      length,
      parsed: parseResult.value,
    });

    occupiedRanges.push({ start: startIndex, end: startIndex + length });
  }

  return { links, occupiedRanges, unquotedMatches: matches.length, parseFailures };
};
