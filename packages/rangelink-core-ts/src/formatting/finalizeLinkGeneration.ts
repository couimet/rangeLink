import { getLogger } from 'barebone-logger';

import { ComputedSelection } from '../types/ComputedSelection';
import { CoreResult } from '../types/CoreResult';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { FormattedLink } from '../types/FormattedLink';
import { InputSelection } from '../types/InputSelection';
import { LinkType } from '../types/LinkType';
import { quoteLink } from '../utils/quoteLink';

import { composePortableMetadata } from './composePortableMetadata';

/**
 * Result of link generation containing the link and its logging context.
 */
export type LinkGenerationResult = {
  readonly link: string;
  readonly logContext: Record<string, unknown>;
};

/**
 * Helper to finalize link generation with portable metadata, quoting, and logging.
 *
 * When the path contains unsafe characters (spaces, parentheses, shell metacharacters),
 * the link is automatically wrapped in single quotes. The raw unquoted version is
 * preserved in `rawLink` for display and comparison.
 *
 * @param generateLink Function that produces the base link and logging context
 * @param spec Computed selection specification
 * @param inputSelection Original input selection
 * @param linkType Regular or Portable
 * @param delimiters Delimiter configuration
 * @param path File path used to determine if quoting is needed
 */
export const finalizeLinkGeneration = (
  generateLink: () => LinkGenerationResult,
  spec: ComputedSelection,
  inputSelection: InputSelection,
  linkType: LinkType,
  delimiters: DelimiterConfig,
  path: string,
): CoreResult<FormattedLink> => {
  const { link: baseLink, logContext } = generateLink();

  // Append BYOD metadata for portable links (creates new string, doesn't mutate)
  const rawLink =
    linkType === LinkType.Portable
      ? baseLink + composePortableMetadata(delimiters, spec.rangeFormat)
      : baseLink;

  const link = quoteLink(rawLink, path);

  const logger = getLogger();
  logger.debug(
    {
      ...logContext, // Spread FIRST - might contain colliding keys
      fn: 'formatLink', // Our attributes LAST - override any collisions
      link,
      rawLink,
      linkLength: link.length,
    },
    'Generated link',
  );

  return CoreResult.ok({
    link,
    rawLink,
    linkType,
    delimiters,
    computedSelection: spec,
    rangeFormat: spec.rangeFormat,
    selectionType: inputSelection.selectionType,
  });
};
