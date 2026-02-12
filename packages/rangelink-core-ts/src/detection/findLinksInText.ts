import type { Logger } from 'barebone-logger';

import type { DelimiterConfig } from '../types/DelimiterConfig';
import type { DetectedLink } from '../types/DetectedLink';
import { buildLinkPattern } from '../utils/buildLinkPattern';

import { detectQuotedLinks } from './detectQuotedLinks';
import { detectUnquotedLinks } from './detectUnquotedLinks';
import type { Cancellable } from './types';

export type { Cancellable } from './types';

/**
 * Find all RangeLinks in text, including quoted links with spaces.
 *
 * Two-pass detection:
 * 1. Standard regex pass for unquoted links (using buildLinkPattern)
 * 2. Quoted fallback: scans for single- and double-quoted segments and validates inner content via parseLink
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
export const findLinksInText = (
  text: string,
  delimiters: DelimiterConfig,
  logger: Logger,
  token?: Cancellable,
): DetectedLink[] => {
  const logCtx = { fn: 'findLinksInText' };

  const pattern = buildLinkPattern(delimiters);
  const { links, occupiedRanges, unquotedMatches, parseFailures } = detectUnquotedLinks(
    text,
    pattern,
    delimiters,
    logger,
    token,
  );

  const { quotedCandidates, quotedParseFailures, quotedReplacements } = detectQuotedLinks(
    text,
    links,
    occupiedRanges,
    delimiters,
    logger,
    token,
  );

  const hasActivity = links.length > 0 || parseFailures > 0 || quotedCandidates > 0;
  if (hasActivity) {
    logger.debug(
      {
        ...logCtx,
        textLength: text.length,
        unquotedMatches,
        quotedCandidates,
        quotedReplacements,
        linksDetected: links.length,
        parseFailures,
        quotedParseFailures,
      },
      'Link detection complete',
    );
  }

  return links;
};
