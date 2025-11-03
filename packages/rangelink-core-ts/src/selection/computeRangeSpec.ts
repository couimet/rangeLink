import { SelectionValidationError } from '../errors/SelectionValidationError';
import { ComputedSelection } from '../types/ComputedSelection';
import { FormatOptions } from '../types/FormatOptions';
import { HashMode } from '../types/HashMode';
import { InputSelection } from '../types/InputSelection';
import { RangeFormat } from '../types/RangeFormat';
import { RangeLinkMessageCode } from '../types/RangeLinkMessageCode';
import { RangeNotation } from '../types/RangeNotation';
import { Err, Ok, Result } from '../types/Result';
import { SelectionCoverage } from '../types/SelectionCoverage';
import { SelectionType } from '../types/SelectionType';
import { validateInputSelection } from './validateInputSelection';

/**
 * Analyze selections and compute the range specification for link generation.
 * Converts 0-based selection to 1-based line/position numbers.
 *
 * @param inputSelection InputSelection containing selections array and selectionType
 * @param options Optional formatting parameters (notation, linkType, etc.)
 * @returns Result<ComputedSelection, RangeLinkMessageCode> - Ok with computed selection or Err with error code
 */
export function computeRangeSpec(
  inputSelection: InputSelection,
  options?: FormatOptions,
): Result<ComputedSelection, RangeLinkMessageCode> {
  // Validate input selection (throws SelectionValidationError on failure)
  try {
    validateInputSelection(inputSelection);
  } catch (error) {
    if (error instanceof SelectionValidationError) {
      return Err(error.code);
    }
    throw error; // Re-throw unexpected errors
  }

  const { selections, selectionType } = inputSelection;
  const notation = options?.notation ?? RangeNotation.Auto;
  const primary = selections[0];

  // Convert to 1-based indexing
  const startLine = primary.startLine + 1;
  const endLine =
    (selectionType === SelectionType.Rectangular
      ? selections[selections.length - 1].startLine
      : primary.endLine) + 1;
  const startPosition = primary.startCharacter + 1;
  const endPosition = primary.endCharacter + 1;

  // Rectangular selection always uses positions and double-hash
  if (selectionType === SelectionType.Rectangular) {
    return Ok({
      startLine,
      endLine,
      startPosition,
      endPosition,
      rangeFormat: RangeFormat.WithPositions,
      hashMode: HashMode.RectangularMode,
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

  return Ok({
    startLine,
    endLine,
    startPosition: usePositions ? startPosition : undefined,
    endPosition: usePositions ? endPosition : undefined,
    rangeFormat,
    hashMode: HashMode.Normal,
  });
}
