import { getLogger } from 'barebone-logger';

import { RangeLinkError } from '../errors/RangeLinkError';
import { computeRangeSpec } from '../selection/computeRangeSpec';
import { ComputedSelection } from '../types/ComputedSelection';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { FormatOptions } from '../types/FormatOptions';
import { FormattedLink } from '../types/FormattedLink';
import { InputSelection } from '../types/InputSelection';
import { LinkType } from '../types/LinkType';
import { Result } from '../types/Result';

import { buildAnchor } from './buildAnchor';
import { composePortableMetadata } from './composePortableMetadata';
import { formatSimpleLineReference } from './formatSimpleLineReference';
import { joinWithHash } from './joinWithHash';

/**
 * Result of link generation containing the link and its logging context.
 */
type LinkGenerationResult = {
  readonly link: string;
  readonly logContext: Record<string, unknown>;
};

/**
 * Helper to finalize link generation with portable metadata and logging.
 *
 * @param generateLink Function that produces the base link and logging context
 * @param spec Computed selection specification
 * @param inputSelection Original input selection
 * @param linkType Regular or Portable
 * @param delimiters Delimiter configuration
 * @returns FormattedLink wrapped in Result.ok
 */
const finalizeLinkGeneration = (
  generateLink: () => LinkGenerationResult,
  spec: ComputedSelection,
  inputSelection: InputSelection,
  linkType: LinkType,
  delimiters: DelimiterConfig,
): Result<FormattedLink, RangeLinkError> => {
  const { link: baseLink, logContext } = generateLink();

  // Append BYOD metadata for portable links (creates new string, doesn't mutate)
  const link =
    linkType === LinkType.Portable
      ? baseLink + composePortableMetadata(delimiters, spec.rangeFormat)
      : baseLink;

  const logger = getLogger();
  logger.debug(
    {
      ...logContext, // Spread FIRST - might contain colliding keys
      fn: 'formatLink', // Our attributes LAST - override any collisions
      link,
      linkLength: link.length,
    },
    'Generated link',
  );

  return Result.ok({
    link,
    linkType,
    delimiters,
    computedSelection: spec,
    rangeFormat: spec.rangeFormat,
    selectionType: inputSelection.selectionType,
  });
};

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
    return finalizeLinkGeneration(
      () => ({
        link: formatSimpleLineReference(path, spec.startLine, delimiters),
        logContext: {
          format: 'simple',
        },
      }),
      spec,
      inputSelection,
      linkType,
      delimiters,
    );
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

  return finalizeLinkGeneration(
    () => ({
      link: joinWithHash(path, anchor, delimiters, inputSelection.selectionType),
      logContext: {
        selectionType: inputSelection.selectionType,
        rangeFormat: spec.rangeFormat,
      },
    }),
    spec,
    inputSelection,
    linkType,
    delimiters,
  );
}
