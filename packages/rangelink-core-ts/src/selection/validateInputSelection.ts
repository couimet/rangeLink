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
    if (sel.start.line < 0 || sel.end.line < 0 || sel.start.char < 0 || sel.end.char < 0) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_NEGATIVE_COORDINATES,
        `Negative coordinates not allowed (startLine=${sel.start.line}, endLine=${sel.end.line}, startChar=${sel.start.char}, endChar=${sel.end.char})`,
      );
    }

    // ERR_3003: Backward line selection
    if (sel.start.line > sel.end.line) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_BACKWARD_LINE,
        `Backward selection not allowed (startLine=${sel.start.line} > endLine=${sel.end.line})`,
      );
    }

    // ERR_3004: Backward character selection on same line
    if (sel.start.line === sel.end.line && sel.start.char > sel.end.char) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_BACKWARD_CHARACTER,
        `Backward character selection not allowed (startChar=${sel.start.char} > endChar=${sel.end.char} on line ${sel.start.line})`,
      );
    }

    // ERR_3011: Zero-width selection (cursor position, not a range)
    if (sel.start.line === sel.end.line && sel.start.char === sel.end.char) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_ZERO_WIDTH,
        `Zero-width selection not allowed (cursor position at line ${sel.start.line}, char ${sel.start.char})`,
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
    if (sel.start.line !== sel.end.line) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_MULTILINE,
        `Rectangular mode requires single-line selections (selection ${i} spans lines ${sel.start.line}-${sel.end.line})`,
      );
    }
  }

  // ERR_3008: All selections must have same character range
  const expectedStartChar = first.start.char;
  const expectedEndChar = first.end.char;

  for (let i = 1; i < selections.length; i++) {
    const sel = selections[i];
    if (sel.start.char !== expectedStartChar || sel.end.char !== expectedEndChar) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_MISMATCHED_COLUMNS,
        `Rectangular mode requires consistent column range (expected ${expectedStartChar}-${expectedEndChar}, got ${sel.start.char}-${sel.end.char} at selection ${i})`,
      );
    }
  }

  // ERR_3006: Selections must be sorted by line number
  for (let i = 1; i < selections.length; i++) {
    const prev = selections[i - 1];
    const curr = selections[i];

    if (curr.start.line < prev.start.line) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_UNSORTED,
        `Rectangular mode selections must be sorted by line number (line ${curr.start.line} comes after line ${prev.start.line})`,
      );
    }
  }

  // ERR_3009: Lines must be contiguous (no gaps)
  for (let i = 1; i < selections.length; i++) {
    const prev = selections[i - 1];
    const curr = selections[i];

    if (curr.start.line !== prev.start.line + 1) {
      throw new SelectionValidationError(
        RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_NON_CONTIGUOUS,
        `Rectangular mode requires contiguous lines (gap between line ${prev.start.line} and ${curr.start.line})`,
      );
    }
  }
}
