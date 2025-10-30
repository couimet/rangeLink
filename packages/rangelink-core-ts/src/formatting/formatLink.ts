import { Err, Ok, Result } from '../types/Result';

import { DelimiterConfig } from '../types/DelimiterConfig';
import { FormatOptions } from '../types/FormatOptions';
import { RangeLinkMessageCode } from '../types/RangeLinkMessageCode';
import { Selection } from '../types/Selection';
import { buildAnchor } from './buildAnchor';
import { computeRangeSpec } from '../selection/computeRangeSpec';
import { formatSimpleLineReference } from './formatSimpleLineReference';
import { getLogger } from '../logging/LogManager';
import { joinWithHash } from './joinWithHash';

/**
 * Format a regular RangeLink from a selection.
 * Main orchestrator for link generation.
 *
 * @param path File path (workspace-relative or absolute)
 * @param selections Array of selections (typically one, or multiple for column mode)
 * @param delimiters Delimiter configuration
 * @param options Optional formatting options
 * @returns Result<string, RangeLinkMessageCode> - formatted link or error
 */
export function formatLink(
  path: string,
  selections: ReadonlyArray<Selection>,
  delimiters: DelimiterConfig,
  options?: FormatOptions,
): Result<string, RangeLinkMessageCode> {
  const logger = getLogger();

  // Check for empty selections array (safety guard)
  if (!selections || selections.length === 0) {
    logger.error({ fn: 'formatLink' }, 'Cannot format link for empty selections array');
    return Err(RangeLinkMessageCode.CONFIG_ERR_DELIMITER_INVALID); // TODO: Add proper error code
  }

  const spec = computeRangeSpec(selections, options);

  // Special case: single-line full-line selection
  if (
    spec.startLine === spec.endLine &&
    spec.rangeFormat === 'LineOnly' &&
    spec.startPosition === undefined
  ) {
    const result = formatSimpleLineReference(path, spec.startLine, delimiters);
    logger.debug({ fn: 'formatLink', format: 'simple' }, `Generated simple line reference`);
    return Ok(result);
  }

  // Build standard anchor
  const anchor = buildAnchor(
    spec.startLine,
    spec.endLine,
    spec.startPosition,
    spec.endPosition,
    delimiters,
    spec.rangeFormat,
  );

  const result = joinWithHash(path, anchor, delimiters, spec.hashMode);

  logger.debug(
    {
      fn: 'formatLink',
      hashMode: spec.hashMode,
      rangeFormat: spec.rangeFormat,
    },
    `Generated link`,
  );

  return Ok(result);
}

