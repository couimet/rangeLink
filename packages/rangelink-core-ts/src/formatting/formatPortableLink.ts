import { Ok, Result } from '../types/Result';

import { DelimiterConfig } from '../types/DelimiterConfig';
import { FormatOptions } from '../types/FormatOptions';
import { RangeFormat } from '../types/RangeFormat';
import { RangeLinkMessageCode } from '../types/RangeLinkMessageCode';
import { Selection } from '../types/Selection';
import { buildAnchor } from './buildAnchor';
import { composePortableMetadata } from './composePortableMetadata';
import { computeRangeSpec } from '../selection/computeRangeSpec';
import { getLogger } from '../logging/LogManager';
import { joinWithHash } from './joinWithHash';

/**
 * Format a portable RangeLink (BYOD - Bring Your Own Delimiters) from selections.
 * Embeds delimiter configuration in the link itself for cross-configuration sharing.
 *
 * @param path File path (workspace-relative or absolute)
 * @param selections Array of selections (multiple for column mode)
 * @param delimiters Delimiter configuration
 * @param options Optional formatting options
 * @returns Result<string, RangeLinkMessageCode> - formatted portable link or error
 */
export function formatPortableLink(
  path: string,
  selections: ReadonlyArray<Selection>,
  delimiters: DelimiterConfig,
  options?: FormatOptions,
): Result<string, RangeLinkMessageCode> {
  const logger = getLogger();

  const spec = computeRangeSpec(selections, options);

  const anchor = buildAnchor(
    spec.startLine,
    spec.endLine,
    spec.startPosition,
    spec.endPosition,
    delimiters,
    spec.rangeFormat,
  );

  const core = joinWithHash(path, anchor, delimiters, spec.hashMode);
  const includePosition = spec.rangeFormat === RangeFormat.WithPositions;
  const metadata = composePortableMetadata(delimiters, includePosition);

  const result = `${core}${metadata}`;

  logger.debug(
    {
      fn: 'formatPortableLink',
      hashMode: spec.hashMode,
      rangeFormat: spec.rangeFormat,
      includePosition,
    },
    `Generated portable link`,
  );

  return Ok(result);
}

