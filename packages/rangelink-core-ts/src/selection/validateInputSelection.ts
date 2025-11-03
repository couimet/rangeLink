import { SelectionValidationError } from '../errors/SelectionValidationError';
import { InputSelection } from '../types/InputSelection';
import { RangeLinkMessageCode } from '../types/RangeLinkMessageCode';
import { SelectionType } from '../types/SelectionType';

/**
 * Validates InputSelection structure and constraints.
 * Internal validation function - throws on invalid input.
 * Public APIs (computeRangeSpec, formatLink) catch and convert to Result.
 *
 * @param inputSelection The input selection to validate
 * @throws {SelectionValidationError} If validation fails
 */
export function validateInputSelection(inputSelection: InputSelection): void {
  const { selections, selectionType } = inputSelection;

  // ERR_3001: Empty selections array
  if (selections.length === 0) {
    throw new SelectionValidationError(
      RangeLinkMessageCode.SELECTION_ERR_EMPTY,
      'Selections array must not be empty',
    );
  }

  // ERR_3010: Unknown SelectionType (exhaustive check)
  if (selectionType !== SelectionType.Normal && selectionType !== SelectionType.Rectangular) {
    throw new SelectionValidationError(
      RangeLinkMessageCode.SELECTION_ERR_UNKNOWN_TYPE,
      `Unknown SelectionType: "${selectionType as string}"`,
    );
  }

  // Validate each selection
  for (let i = 0; i < selections.length; i++) {
    const sel = selections[i];

    // ERR_3005: Negative coordinates
    if (sel.startLine < 0 || sel.endLine < 0 || sel.startCharacter < 0 || sel.endCharacter < 0) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_NEGATIVE_COORDINATES,
        `Negative coordinates not allowed (startLine=${sel.startLine}, endLine=${sel.endLine}, startChar=${sel.startCharacter}, endChar=${sel.endCharacter})`,
      );
    }

    // ERR_3003: Backward line selection
    if (sel.startLine > sel.endLine) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_BACKWARD_LINE,
        `Backward selection not allowed (startLine=${sel.startLine} > endLine=${sel.endLine})`,
      );
    }

    // ERR_3004: Backward character selection on same line
    if (sel.startLine === sel.endLine && sel.startCharacter > sel.endCharacter) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_BACKWARD_CHARACTER,
        `Backward character selection not allowed (startChar=${sel.startCharacter} > endChar=${sel.endCharacter} on line ${sel.startLine})`,
      );
    }

    // ERR_3011: Zero-width selection (cursor position, not a range)
    if (sel.startLine === sel.endLine && sel.startCharacter === sel.endCharacter) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_ZERO_WIDTH,
        `Zero-width selection not allowed (cursor position at line ${sel.startLine}, char ${sel.startCharacter})`,
      );
    }
  }

  // Mode-specific validation
  if (selectionType === SelectionType.Normal) {
    validateNormalMode(selections);
  } else if (selectionType === SelectionType.Rectangular) {
    validateRectangularMode(selections);
  }
}

/**
 * Validates Normal mode selections.
 *
 * @param selections Array of selections
 * @throws {SelectionValidationError} If validation fails
 */
function validateNormalMode(selections: InputSelection['selections']): void {
  // ERR_3002: Normal mode must have exactly 1 selection
  if (selections.length !== 1) {
    throw new SelectionValidationError(
      RangeLinkMessageCode.SELECTION_ERR_NORMAL_MULTIPLE,
      `Normal mode does not support multiple selections (got ${selections.length}). Multiple non-contiguous selections are not yet implemented.`,
    );
  }
}

/**
 * Validates Rectangular mode selections.
 *
 * @param selections Array of selections
 * @throws {SelectionValidationError} If validation fails
 */
function validateRectangularMode(selections: InputSelection['selections']): void {
  if (selections.length === 0) return; // Already validated above

  const first = selections[0];

  // ERR_3007: All rectangular selections must be single-line
  for (let i = 0; i < selections.length; i++) {
    const sel = selections[i];
    if (sel.startLine !== sel.endLine) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_MULTILINE,
        `Rectangular mode requires single-line selections (selection ${i} spans lines ${sel.startLine}-${sel.endLine})`,
      );
    }
  }

  // ERR_3008: All selections must have same character range
  const expectedStartChar = first.startCharacter;
  const expectedEndChar = first.endCharacter;

  for (let i = 1; i < selections.length; i++) {
    const sel = selections[i];
    if (sel.startCharacter !== expectedStartChar || sel.endCharacter !== expectedEndChar) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_MISMATCHED_COLUMNS,
        `Rectangular mode requires consistent column range (expected ${expectedStartChar}-${expectedEndChar}, got ${sel.startCharacter}-${sel.endCharacter} at selection ${i})`,
      );
    }
  }

  // ERR_3006: Selections must be sorted by line number
  for (let i = 1; i < selections.length; i++) {
    const prev = selections[i - 1];
    const curr = selections[i];

    if (curr.startLine < prev.startLine) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_UNSORTED,
        `Rectangular mode selections must be sorted by line number (line ${curr.startLine} comes after line ${prev.startLine})`,
      );
    }
  }

  // ERR_3009: Lines must be contiguous (no gaps)
  for (let i = 1; i < selections.length; i++) {
    const prev = selections[i - 1];
    const curr = selections[i];

    if (curr.startLine !== prev.startLine + 1) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_NON_CONTIGUOUS,
        `Rectangular mode requires contiguous lines (gap between line ${prev.startLine} and ${curr.startLine})`,
      );
    }
  }
}
