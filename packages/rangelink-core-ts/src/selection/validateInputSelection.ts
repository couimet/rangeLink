import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { InputSelection } from '../types/InputSelection';
import { SelectionType } from '../types/SelectionType';

import { validateNormalMode } from './validateNormalMode';
import { validateRectangularMode } from './validateRectangularMode';

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

  switch (selectionType) {
    case SelectionType.Normal:
      validateNormalMode(selections);
      break;
    case SelectionType.Rectangular:
      validateRectangularMode(selections);
      break;
    default: {
      const _exhaustive: never = selectionType;
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_UNKNOWN_TYPE,
        message: `Unknown SelectionType: "${_exhaustive}"`,
        functionName: 'validateInputSelection',
        details: { selectionType: _exhaustive },
      });
    }
  }
}
