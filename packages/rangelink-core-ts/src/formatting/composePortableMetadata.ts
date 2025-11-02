import { PORTABLE_METADATA_SEPARATOR } from '../constants/PORTABLE_METADATA_SEPARATOR';
import { DelimiterConfig } from '../types/DelimiterConfig';

/**
 * Compose portable metadata for BYOD (Bring Your Own Delimiters) links.
 * Embeds delimiter configuration in the link itself.
 *
 * @param delimiters Delimiter configuration
 * @param includePosition Whether to include the position delimiter in metadata
 * @returns Metadata string (e.g., "~#~L~-~C~")
 */
export function composePortableMetadata(
  delimiters: DelimiterConfig,
  includePosition: boolean,
): string {
  const { hash, line, range, position } = delimiters;
  const parts = [hash, line, range];
  if (includePosition) {
    parts.push(position);
  }
  return `${PORTABLE_METADATA_SEPARATOR}${parts.join(PORTABLE_METADATA_SEPARATOR)}${PORTABLE_METADATA_SEPARATOR}`;
}

