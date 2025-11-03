import { DelimiterConfig } from '../types/DelimiterConfig';
import { SelectionType } from '../types/SelectionType';

/**
 * Join a path with an anchor, adding one or two hash delimiters depending on selection type.
 *
 * @param path File path
 * @param anchor Anchor string (e.g., "L10C5-L20C10")
 * @param delimiters Delimiter configuration
 * @param selectionType Selection type (Normal = single hash, Rectangular = double hash)
 * @returns Formatted link (e.g., "path#L10" or "path##L10C5-L20C10")
 */
export function joinWithHash(
  path: string,
  anchor: string,
  delimiters: DelimiterConfig,
  selectionType: SelectionType = SelectionType.Normal,
): string {
  const { hash: delimHash } = delimiters;
  const prefix =
    selectionType === SelectionType.Rectangular ? `${delimHash}${delimHash}` : `${delimHash}`;
  return `${path}${prefix}${anchor}`;
}
