import type { Logger } from 'barebone-logger';
import type { DelimiterConfig, ParsedLink, Result } from 'rangelink-core-ts';
import { buildLinkPattern, parseLink, RangeLinkError } from 'rangelink-core-ts';

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
  private readonly pattern: RegExp;

  constructor(
    private readonly delimiters: DelimiterConfig,
    private readonly logger: Logger,
  ) {
    this.pattern = buildLinkPattern(delimiters);
    this.logger.debug(
      { fn: 'RangeLinkParser.constructor', delimiters },
      'RangeLinkParser initialized',
    );
  }

  /**
   * Get the compiled RegExp pattern for link detection.
   */
  getPattern(): RegExp {
    return this.pattern;
  }

  /**
   * Parse a RangeLink string into structured data.
   *
   * @param linkText - Raw link text to parse
   * @returns Result with ParsedLink or RangeLinkError
   */
  parseLink(linkText: string): Result<ParsedLink, RangeLinkError> {
    return parseLink(linkText, this.delimiters);
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
