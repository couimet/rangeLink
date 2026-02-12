import type { Logger } from 'barebone-logger';

import { parseLink } from '../parsing/parseLink';
import type { DelimiterConfig } from '../types/DelimiterConfig';
import type { DetectedLink } from '../types/DetectedLink';

import { classifyOverlap } from './classifyOverlap';
import type { Cancellable, OccupiedRange } from './types';

const QUOTED_SEGMENT = /(['"])([^'"]+)\1/g;

/**
 * Stats from the quoted detection pass.
 */
export interface QuotedDetectionStats {
  readonly quotedCandidates: number;
  readonly quotedParseFailures: number;
  readonly quotedReplacements: number;
}

/**
 * Detect RangeLinks inside quoted segments (single or double quotes).
 *
 * Enables detection of links with spaces in file/directory names
 * (e.g., `'Meslo Slashed/LICENSE.txt#L10C24-L11C24'`).
 *
 * When a quoted link fully encompasses existing unquoted matches,
 * the unquoted matches are replaced with the quoted one.
 *
 * Mutates `links` and `occupiedRanges` arrays in place.
 *
 * @param text - The text to scan
 * @param links - Mutable array of already-detected links (may be modified)
 * @param occupiedRanges - Mutable array of occupied ranges (may be modified)
 * @param delimiters - Delimiter config for parseLink
 * @param logger - Logger for debug output
 * @param token - Optional cancellation token
 * @returns Stats from the quoted pass
 */
export const detectQuotedLinks = (
  text: string,
  links: DetectedLink[],
  occupiedRanges: OccupiedRange[],
  delimiters: DelimiterConfig,
  logger: Logger,
  token?: Cancellable,
): QuotedDetectionStats => {
  let quotedCandidates = 0;
  let quotedParseFailures = 0;
  let quotedReplacements = 0;

  const quotedMatches = [...text.matchAll(QUOTED_SEGMENT)];

  for (const quotedMatch of quotedMatches) {
    if (token?.isCancellationRequested) break;

    quotedCandidates++;

    const innerContent = quotedMatch[2];
    const quoteStart = quotedMatch.index!;
    const quoteLength = quotedMatch[0].length;
    const quoteEnd = quoteStart + quoteLength;

    const overlap = classifyOverlap(quoteStart, quoteEnd, occupiedRanges);
    if (overlap.type === 'partial') continue;

    const parseResult = parseLink(innerContent, delimiters);
    if (!parseResult.success) {
      quotedParseFailures++;
      continue;
    }

    if (overlap.type === 'encompassing') {
      for (const idx of overlap.encompassedIndices.reverse()) {
        links.splice(idx, 1);
        occupiedRanges.splice(idx, 1);
      }

      quotedReplacements += overlap.encompassedIndices.length;

      logger.debug(
        {
          fn: 'detectQuotedLinks',
          linkText: innerContent,
          replacedCount: overlap.encompassedIndices.length,
        },
        'Quoted link replaced encompassed unquoted match(es)',
      );
    }

    links.push({
      linkText: innerContent,
      startIndex: quoteStart,
      length: quoteLength,
      parsed: parseResult.value,
    });

    occupiedRanges.push({ start: quoteStart, end: quoteEnd });
  }

  return { quotedCandidates, quotedParseFailures, quotedReplacements };
};
