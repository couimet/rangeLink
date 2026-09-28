import type { DelimiterConfig } from '../types/DelimiterConfig';
import type { DetectedLink } from '../types/DetectedLink';
import { buildLinkPattern } from '../utils/buildLinkPattern';

import { detectQuotedLinks } from './detectQuotedLinks';
import { detectTextFragments } from './detectTextFragments';
import { detectUnquotedLinks } from './detectUnquotedLinks';
import type { Cancellable } from './types';

import type { Logger } from '@couimet/logger-contract';

export type { Cancellable } from './types';

/**
 * Find all RangeLinks in text, including quoted links with spaces and text
 * fragment links.
 *
 * Three-pass detection:
 * 1. Text fragment pass for `:~:text=` links (via the text fragment regex),
 *    whose spans are claimed so later passes skip them
 * 2. Standard regex pass for unquoted numeric links (using buildLinkPattern),
 *    skipping ranges already claimed by the text fragment pass
 * 3. Quoted fallback: scans for single- and double-quoted segments and validates inner content via parseLink
 *
 * The quoted pass enables detection of links with spaces in file/directory names
 * (e.g., `'Meslo Slashed/LICENSE.txt#L10C24-L11C24'`). These links are wrapped in
 * single quotes at paste time by RangeLinkService.
 *
 * @param text - The text to scan for links
 * @param delimiters - Delimiter configuration for pattern building and parsing
 * @param logger - Logger for structured debug output
 * @param token - Optional cancellation token
 * @returns Array of detected links with parsed data
 */
export const findLinksInText = (text: string, delimiters: DelimiterConfig, logger: Logger, token?: Cancellable): DetectedLink[] => {
  const logCtx = { fn: 'findLinksInText' };

  const pattern = buildLinkPattern(delimiters);

  const textFragments = detectTextFragments(text, logger, token);
  const unquoted = detectUnquotedLinks(text, pattern, delimiters, textFragments.occupiedRanges, logger, token);

  const links = [...textFragments.links, ...unquoted.links];
  const occupiedRanges = [...textFragments.occupiedRanges, ...unquoted.occupiedRanges];

  const { quotedCandidates, quotedParseFailures, quotedReplacements } = detectQuotedLinks(text, links, occupiedRanges, delimiters, logger, token);

  const hasActivity = links.length > 0 || unquoted.parseFailures > 0 || textFragments.parseFailures > 0 || quotedCandidates > 0;
  if (hasActivity) {
    logger.debug(
      {
        ...logCtx,
        textLength: text.length,
        textFragmentCandidates: textFragments.textFragmentCandidates,
        unquotedMatches: unquoted.unquotedMatches,
        quotedCandidates,
        quotedReplacements,
        linksDetected: links.length,
        parseFailures: unquoted.parseFailures,
        textFragmentParseFailures: textFragments.parseFailures,
        quotedParseFailures,
      },
      'Link detection complete',
    );
  }

  return links;
};
