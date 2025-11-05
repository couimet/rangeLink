import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { InputSelection } from '../types/InputSelection';
import { SelectionType } from '../types/SelectionType';

/**
 * Validates InputSelection structure and constraints.
 * Internal validation function - throws on invalid input.
 * Public APIs (computeRangeSpec, formatLink) catch and convert to Result.
 *
 * @param inputSelection The input selection to validate
 * @throws {RangeLinkError} If validation fails
 */
export function validateInputSelection(inputSelection: InputSelection): void {
  const { selections, selectionType } = inputSelection;

  if (selections.length === 0) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.SELECTION_EMPTY,
      message: 'Selections array must not be empty',
      functionName: 'validateInputSelection',
      details: { selectionsLength: 0 },
    });
  }

  if (selectionType !== SelectionType.Normal && selectionType !== SelectionType.Rectangular) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.SELECTION_UNKNOWN_TYPE,
      message: `Unknown SelectionType: "${selectionType as string}"`,
      functionName: 'validateInputSelection',
      details: { selectionType },
    });
  }

  // Validate each selection
  for (let i = 0; i < selections.length; i++) {
    const sel = selections[i];

    if (sel.start.line < 0 || sel.end.line < 0 || sel.start.char < 0 || sel.end.char < 0) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_NEGATIVE_COORDINATES,
        message: `Negative coordinates not allowed (startLine=${sel.start.line}, endLine=${sel.end.line}, startChar=${sel.start.char}, endChar=${sel.end.char})`,
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: i,
          startLine: sel.start.line,
          endLine: sel.end.line,
          startChar: sel.start.char,
          endChar: sel.end.char,
        },
      });
    }

    if (sel.start.line > sel.end.line) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_BACKWARD_LINE,
        message: `Backward selection not allowed (startLine=${sel.start.line} > endLine=${sel.end.line})`,
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: i,
          startLine: sel.start.line,
          endLine: sel.end.line,
        },
      });
    }

    if (sel.start.line === sel.end.line && sel.start.char > sel.end.char) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_BACKWARD_CHARACTER,
        message: `Backward character selection not allowed (startChar=${sel.start.char} > endChar=${sel.end.char} on line ${sel.start.line})`,
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: i,
          line: sel.start.line,
          startChar: sel.start.char,
          endChar: sel.end.char,
        },
      });
    }

    if (sel.start.line === sel.end.line && sel.start.char === sel.end.char) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_ZERO_WIDTH,
        message: `Zero-width selection not allowed (cursor position at line ${sel.start.line}, char ${sel.start.char})`,
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: i,
          line: sel.start.line,
          char: sel.start.char,
        },
      });
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
 * @throws {RangeLinkError} If validation fails
 */
function validateNormalMode(selections: InputSelection['selections']): void {
  if (selections.length !== 1) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.SELECTION_NORMAL_MULTIPLE,
      message: `Normal mode does not support multiple selections (got ${selections.length}). Multiple non-contiguous selections are not yet implemented.`,
      functionName: 'validateNormalMode',
      details: { selectionsLength: selections.length },
    });
  }
}

/**
 * Validates Rectangular mode selections.
 *
 * @param selections Array of selections
 * @throws {RangeLinkError} If validation fails
 */
function validateRectangularMode(selections: InputSelection['selections']): void {
  if (selections.length === 0) return; // Already validated above

  const first = selections[0];

  for (let i = 0; i < selections.length; i++) {
    const sel = selections[i];
    if (sel.start.line !== sel.end.line) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_RECTANGULAR_MULTILINE,
        message: `Rectangular mode requires single-line selections (selection ${i} spans lines ${sel.start.line}-${sel.end.line})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: i,
          startLine: sel.start.line,
          endLine: sel.end.line,
        },
      });
    }
  }

  const expectedStartChar = first.start.char;
  const expectedEndChar = first.end.char;

  for (let i = 1; i < selections.length; i++) {
    const sel = selections[i];
    if (sel.start.char !== expectedStartChar || sel.end.char !== expectedEndChar) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_RECTANGULAR_MISMATCHED_COLUMNS,
        message: `Rectangular mode requires consistent column range (expected ${expectedStartChar}-${expectedEndChar}, got ${sel.start.char}-${sel.end.char} at selection ${i})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: i,
          expectedStartChar,
          expectedEndChar,
          actualStartChar: sel.start.char,
          actualEndChar: sel.end.char,
        },
      });
    }
  }

  for (let i = 1; i < selections.length; i++) {
    const prev = selections[i - 1];
    const curr = selections[i];

    if (curr.start.line < prev.start.line) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_RECTANGULAR_UNSORTED,
        message: `Rectangular mode selections must be sorted by line number (line ${curr.start.line} comes after line ${prev.start.line})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: i,
          previousLine: prev.start.line,
          currentLine: curr.start.line,
        },
      });
    }
  }

  for (let i = 1; i < selections.length; i++) {
    const prev = selections[i - 1];
    const curr = selections[i];

    if (curr.start.line !== prev.start.line + 1) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_RECTANGULAR_NON_CONTIGUOUS,
        message: `Rectangular mode requires contiguous lines (gap between line ${prev.start.line} and ${curr.start.line})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: i,
          previousLine: prev.start.line,
          currentLine: curr.start.line,
          gap: curr.start.line - prev.start.line - 1,
        },
      });
    }
  }
}
