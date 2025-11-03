import { getLogger } from '../logging/LogManager';
import { computeRangeSpec } from '../selection/computeRangeSpec';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { FormatOptions } from '../types/FormatOptions';
import { InputSelection } from '../types/InputSelection';
import { RangeLinkMessageCode } from '../types/RangeLinkMessageCode';
import { Ok, Result } from '../types/Result';

import { buildAnchor } from './buildAnchor';
import { formatSimpleLineReference } from './formatSimpleLineReference';
import { joinWithHash } from './joinWithHash';

/**
 * Format a regular RangeLink from a selection.
 * Main orchestrator for link generation.
 *
 * @param path File path (workspace-relative or absolute)
 * @param inputSelection InputSelection containing selections and selectionType
 * @param delimiters Delimiter configuration
 * @param options Optional formatting options
 * @returns Result<string, RangeLinkMessageCode> - formatted link or error code
 */
export function formatLink(
  path: string,
  inputSelection: InputSelection,
  delimiters: DelimiterConfig,
  options?: FormatOptions,
): Result<string, RangeLinkMessageCode> {
  const logger = getLogger();

  // Validate and compute range spec
  const specResult = computeRangeSpec(inputSelection, options);
  if (!specResult.success) {
    return specResult;
  }
  const spec = specResult.value;

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
      result,
      resultLength: result?.length,
    },
    `Generated link: ${result}`,
  );

  return Ok(result);
}
