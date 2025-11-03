import { DelimiterConfig } from '../types/DelimiterConfig';
import { HashMode } from '../types/HashMode';

/**
 * Join a path with an anchor, adding one or two hash delimiters depending on mode.
 *
 * @param path File path
 * @param anchor Anchor string (e.g., "L10C5-L20C10")
 * @param delimiters Delimiter configuration
 * @param mode Hash mode (Normal = single hash, RectangularMode = double hash)
 * @returns Formatted link (e.g., "path#L10" or "path##L10C5-L20C10")
 */
export function joinWithHash(
  path: string,
  anchor: string,
  delimiters: DelimiterConfig,
  mode: HashMode = HashMode.Normal,
): string {
  const { hash: delimHash } = delimiters;
  const prefix = mode === HashMode.RectangularMode ? `${delimHash}${delimHash}` : `${delimHash}`;
  return `${path}${prefix}${anchor}`;
}
