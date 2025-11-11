import { getLogger } from 'barebone-logger';

import { RangeLinkError } from '../errors/RangeLinkError';
import { computeRangeSpec } from '../selection/computeRangeSpec';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { FormatOptions } from '../types/FormatOptions';
import { FormattedLink } from '../types/FormattedLink';
import { InputSelection } from '../types/InputSelection';
import { LinkType } from '../types/LinkType';
import { Result } from '../types/Result';

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
 * @returns Result<FormattedLink, RangeLinkError> - formatted link with metadata or error
 */
export function formatLink(
  path: string,
  inputSelection: InputSelection,
  delimiters: DelimiterConfig,
  options?: FormatOptions,
): Result<FormattedLink, RangeLinkError> {
  const logger = getLogger();

  // Validate and compute range spec
  const specResult = computeRangeSpec(inputSelection, options);
  if (!specResult.success) {
    return Result.err(specResult.error);
  }
  const spec = specResult.value;

  const linkType = options?.linkType ?? LinkType.Regular;

  // Special case: single-line full-line selection
  if (
    spec.startLine === spec.endLine &&
    spec.rangeFormat === 'LineOnly' &&
    spec.startPosition === undefined
  ) {
    const link = formatSimpleLineReference(path, spec.startLine, delimiters);
    logger.debug({ fn: 'formatLink', format: 'simple' }, `Generated simple line reference`);

    return Result.ok({
      link,
      linkType,
      delimiters,
      computedSelection: spec,
      rangeFormat: spec.rangeFormat,
      selectionType: inputSelection.selectionType,
    });
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

  const link = joinWithHash(path, anchor, delimiters, inputSelection.selectionType);

  logger.debug(
    {
      fn: 'formatLink',
      selectionType: inputSelection.selectionType,
      rangeFormat: spec.rangeFormat,
      link,
      linkLength: link?.length,
    },
    `Generated link: ${link}`,
  );

  return Result.ok({
    link,
    linkType,
    delimiters,
    computedSelection: spec,
    rangeFormat: spec.rangeFormat,
    selectionType: inputSelection.selectionType,
  });
}
