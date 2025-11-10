import { RangeLinkError } from '../errors/RangeLinkError';
import { ComputedSelection } from '../types/ComputedSelection';
import { FormatOptions } from '../types/FormatOptions';
import { InputSelection } from '../types/InputSelection';
import { RangeFormat } from '../types/RangeFormat';
import { RangeNotation } from '../types/RangeNotation';
import { Result } from '../types/Result';
import { SelectionCoverage } from '../types/SelectionCoverage';
import { SelectionType } from '../types/SelectionType';

import { validateInputSelection } from './validateInputSelection';

/**
 * Analyze selections and compute the range specification for link generation.
 * Converts 0-based selection to 1-based line/position numbers.
 *
 * @param inputSelection InputSelection containing selections array and selectionType
 * @param options Optional formatting parameters (notation, linkType, etc.)
 * @returns Result<ComputedSelection, RangeLinkError> - Ok with computed selection or Err with error
 */
export function computeRangeSpec(
  inputSelection: InputSelection,
  options?: FormatOptions,
): Result<ComputedSelection, RangeLinkError> {
  try {
    validateInputSelection(inputSelection);
  } catch (error) {
    if (error instanceof RangeLinkError) {
      return Result.err(error);
    }
    throw error; // Re-throw unexpected errors
  }

  const { selections, selectionType } = inputSelection;
  const notation = options?.notation ?? RangeNotation.Auto;
  const primary = selections[0];

  // Convert to 1-based indexing
  const startLine = primary.start.line + 1;
  const endLine =
    (selectionType === SelectionType.Rectangular
      ? selections[selections.length - 1].start.line
      : primary.end.line) + 1;
  const startPosition = primary.start.char + 1;
  const endPosition = primary.end.char + 1;

  // Rectangular selection always uses positions
  if (selectionType === SelectionType.Rectangular) {
    return Result.ok({
      startLine,
      endLine,
      startPosition,
      endPosition,
      rangeFormat: RangeFormat.WithPositions,
    });
  }

  // Normal selection: determine range format based on notation preference and coverage
  let rangeFormat: RangeFormat;

  if (notation === RangeNotation.EnforceFullLine) {
    // User explicitly wants line-only format
    rangeFormat = RangeFormat.LineOnly;
  } else if (notation === RangeNotation.EnforcePositions) {
    // User explicitly wants positions format
    rangeFormat = RangeFormat.WithPositions;
  } else {
    // Auto mode: use most compact format based on coverage
    const allFullLine = selections.every((s) => s.coverage === SelectionCoverage.FullLine);
    rangeFormat = allFullLine ? RangeFormat.LineOnly : RangeFormat.WithPositions;
  }

  const usePositions = rangeFormat === RangeFormat.WithPositions;

  return Result.ok({
    startLine,
    endLine,
    ...(usePositions && { startPosition, endPosition }),
    rangeFormat,
  });
}
