import type { Logger } from 'barebone-logger';
import type { CoreResult, DelimiterConfigGetter, ParsedLink } from 'rangelink-core-ts';
import { buildLinkPattern, parseLink } from 'rangelink-core-ts';

import { formatLinkTooltip } from './utils';

/**
 * Pure parser for RangeLink format detection and validation.
 *
 * Provides parsing functionality without IDE dependencies:
 * - Pattern building for link detection
 * - Link parsing and validation
 * - Tooltip formatting
 */
export class RangeLinkParser {
  constructor(
    private readonly getDelimiters: DelimiterConfigGetter,
    private readonly logger: Logger,
  ) {
    this.logger.debug({ fn: 'RangeLinkParser.constructor' }, 'RangeLinkParser initialized');
  }

  /**
   * Get the compiled RegExp pattern for link detection.
   */
  getPattern(): RegExp {
    return buildLinkPattern(this.getDelimiters());
  }

  /**
   * Parse a RangeLink string into structured data.
   *
   * @param linkText - Raw link text to parse
   */
  parseLink(linkText: string): CoreResult<ParsedLink> {
    return parseLink(linkText, this.getDelimiters());
  }

  /**
   * Format tooltip text for a parsed link.
   *
   * @param parsed - Parsed link data
   * @returns Formatted tooltip string or undefined
   */
  formatTooltip(parsed: ParsedLink): string | undefined {
    return formatLinkTooltip(parsed);
  }
}
