import { ComputedSelection } from '../types/ComputedSelection';
import { FormatOptions } from '../types/FormatOptions';
import { HashMode } from '../types/HashMode';
import { RangeFormat } from '../types/RangeFormat';
import { Selection } from '../types/Selection';
import { isColumnSelection } from './isColumnSelection';

/**
 * Analyze selections and compute the range specification for link generation.
 * Converts 0-based selection to 1-based line/position numbers.
 *
 * @param selections Array of selections (typically one, or multiple for column mode)
 * @param options Optional formatting options
 * @returns ComputedSelection with 1-based line/position numbers
 */
export function computeRangeSpec(
  selections: ReadonlyArray<Selection>,
  options?: FormatOptions,
): ComputedSelection {
  const isColumn = isColumnSelection(selections);
  const primary = selections[0];

  // Convert to 1-based indexing
  const startLine = primary.startLine + 1;
  const endLine = (isColumn ? selections[selections.length - 1].startLine : primary.endLine) + 1;
  const startPosition = primary.startCharacter + 1;
  const endPosition = primary.endCharacter + 1;

  if (isColumn) {
    return {
      startLine,
      endLine,
      startPosition,
      endPosition,
      rangeFormat: RangeFormat.WithPositions,
      hashMode: HashMode.ColumnMode,
    };
  }

  // Check if this is a full-block selection (start at column 0, end at column 0)
  // or if explicitly marked as full-line via options
  const isFullBlock = primary.startCharacter === 0 && primary.endCharacter === 0;
  const usePositions = !isFullBlock && !options?.isFullLine;

  return {
    startLine,
    endLine,
    startPosition: usePositions ? startPosition : undefined,
    endPosition: usePositions ? endPosition : undefined,
    rangeFormat: usePositions ? RangeFormat.WithPositions : RangeFormat.LineOnly,
    hashMode: HashMode.Normal,
  };
}

