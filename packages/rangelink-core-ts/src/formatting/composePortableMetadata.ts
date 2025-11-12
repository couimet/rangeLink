import { PORTABLE_METADATA_SEPARATOR } from '../constants/PORTABLE_METADATA_SEPARATOR';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { RangeFormat } from '../types/RangeFormat';

/**
 * Compose portable metadata for BYOD (Bring Your Own Delimiters) links.
 * Embeds delimiter configuration in the link itself.
 *
 * @param delimiters Delimiter configuration
 * @param rangeFormat Whether to include the position delimiter in metadata
 * @returns Metadata string (e.g., "~#~L~-~C~" or "~#~L~-~")
 */
export const composePortableMetadata = (
  delimiters: DelimiterConfig,
  rangeFormat: RangeFormat,
): string => {
  const { hash, line, range, position } = delimiters;
  const parts = [hash, line, range];
  if (rangeFormat === RangeFormat.WithPositions) {
    parts.push(position);
  }
  return `${PORTABLE_METADATA_SEPARATOR}${parts.join(PORTABLE_METADATA_SEPARATOR)}${PORTABLE_METADATA_SEPARATOR}`;
};
