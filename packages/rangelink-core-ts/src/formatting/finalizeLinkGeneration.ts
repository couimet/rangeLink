import { getLogger } from 'barebone-logger';

import { RangeLinkError } from '../errors/RangeLinkError';
import { ComputedSelection } from '../types/ComputedSelection';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { FormattedLink } from '../types/FormattedLink';
import { InputSelection } from '../types/InputSelection';
import { LinkType } from '../types/LinkType';
import { Result } from '../types/Result';

import { composePortableMetadata } from './composePortableMetadata';

/**
 * Result of link generation containing the link and its logging context.
 */
export type LinkGenerationResult = {
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
export const finalizeLinkGeneration = (
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
