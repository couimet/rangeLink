import { computeRangeSpec } from '../selection/computeRangeSpec';
import { CoreResult } from '../types/CoreResult';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { FormatOptions } from '../types/FormatOptions';
import { FormattedLink } from '../types/FormattedLink';
import { InputSelection } from '../types/InputSelection';
import { LinkType } from '../types/LinkType';

import { buildAnchor } from './buildAnchor';
import { finalizeLinkGeneration } from './finalizeLinkGeneration';
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
 */
export function formatLink(
  path: string,
  inputSelection: InputSelection,
  delimiters: DelimiterConfig,
  options?: FormatOptions,
): CoreResult<FormattedLink> {
  // Validate and compute range spec
  const specResult = computeRangeSpec(inputSelection, options);
  if (!specResult.success) {
    return CoreResult.err(specResult.error);
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
