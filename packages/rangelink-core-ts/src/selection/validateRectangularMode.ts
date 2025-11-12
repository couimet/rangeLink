import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { InputSelection } from '../types/InputSelection';

/**
 * Validates Rectangular mode selections.
 *
 * Ensures all selections:
 * - Are single-line (start.line === end.line)
 * - Have consistent column ranges across all selections
 * - Are sorted by line number
 * - Are contiguous (no gaps between lines)
 *
 * @param selections Array of selections to validate
 * @throws {RangeLinkError} If validation fails
 */
export const validateRectangularMode = (selections: InputSelection['selections']): void => {
  // Defensive guard: should never happen due to upstream validation,
  // but protects against future refactoring mistakes
  if (selections.length === 0) return;

  const first = selections[0];

  // Validate all selections are single-line
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

  // Validate consistent column ranges
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

  // Validate selections are sorted by line number
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

  // Validate selections are contiguous (no gaps)
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
};
