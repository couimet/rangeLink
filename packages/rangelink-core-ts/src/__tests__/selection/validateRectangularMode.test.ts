import { validateRectangularMode } from '../../selection/validateRectangularMode';
import { InputSelection } from '../../types/InputSelection';
import { SelectionCoverage } from '../../types/SelectionCoverage';

import { getRandomInt, getUniqueInt } from '@couimet/dynamic-testing';

const COORDINATE_OFFSET = 10;

describe('validateRectangularMode', () => {
  let startLine: number;
  let startChar: number;
  let endChar: number;

  beforeEach(() => {
    startLine = getUniqueInt();
    startChar = getUniqueInt();
    endChar = startChar + COORDINATE_OFFSET;
  });

  describe('Empty selections array (defensive guard)', () => {
    it('should return early for empty array without throwing', () => {
      const selections: InputSelection['selections'] = [];

      validateRectangularMode(selections);
    });
  });

  describe('Single-line requirement', () => {
    it('should throw error when selection spans multiple lines', () => {
      const endLine = startLine + getRandomInt(2, 5);
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: endLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_MULTILINE', {
        message: `Rectangular mode requires single-line selections (selection 0 spans lines ${startLine}-${endLine})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 0,
          startLine,
          endLine,
        },
      });
    });

    it('should throw error for second selection spanning multiple lines', () => {
      const badStartLine = startLine + 1;
      const badEndLine = badStartLine + getRandomInt(2, 5);
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: badStartLine, character: startChar },
          end: { line: badEndLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_MULTILINE', {
        message: `Rectangular mode requires single-line selections (selection 1 spans lines ${badStartLine}-${badEndLine})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          startLine: badStartLine,
          endLine: badEndLine,
        },
      });
    });

    it('should not throw for valid single-line selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });
  });

  describe('Consistent column range requirement', () => {
    it('should throw error for mismatched startCharacter', () => {
      const mismatchedStartChar = startChar + getRandomInt(1, 5);
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: mismatchedStartChar },
          end: { line: startLine + 1, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_MISMATCHED_COLUMNS', {
        message: `Rectangular mode requires consistent column range (expected ${startChar}-${endChar}, got ${mismatchedStartChar}-${endChar} at selection 1)`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          expectedStartCharacter: startChar,
          expectedEndCharacter: endChar,
          actualStartCharacter: mismatchedStartChar,
          actualEndCharacter: endChar,
        },
      });
    });

    it('should throw error for mismatched endCharacter', () => {
      const mismatchedEndChar = endChar + getRandomInt(1, 5);
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: startChar },
          end: { line: startLine + 1, character: mismatchedEndChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_MISMATCHED_COLUMNS', {
        message: `Rectangular mode requires consistent column range (expected ${startChar}-${endChar}, got ${startChar}-${mismatchedEndChar} at selection 1)`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          expectedStartCharacter: startChar,
          expectedEndCharacter: endChar,
          actualStartCharacter: startChar,
          actualEndCharacter: mismatchedEndChar,
        },
      });
    });

    it('should throw error for both startCharacter and endCharacter mismatched', () => {
      const mismatchedStartChar = startChar - getRandomInt(1, 5);
      const mismatchedEndChar = endChar + getRandomInt(1, 5);
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: mismatchedStartChar },
          end: { line: startLine + 1, character: mismatchedEndChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_MISMATCHED_COLUMNS', {
        message: `Rectangular mode requires consistent column range (expected ${startChar}-${endChar}, got ${mismatchedStartChar}-${mismatchedEndChar} at selection 1)`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          expectedStartCharacter: startChar,
          expectedEndCharacter: endChar,
          actualStartCharacter: mismatchedStartChar,
          actualEndCharacter: mismatchedEndChar,
        },
      });
    });

    it('should not throw for consistent column ranges', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: startChar },
          end: { line: startLine + 1, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 2, character: startChar },
          end: { line: startLine + 2, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });
  });

  describe('Sorted by line number requirement', () => {
    it('should throw error for unsorted selections', () => {
      const outOfOrderLine = startLine - getRandomInt(2, 5);
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: outOfOrderLine, character: startChar },
          end: { line: outOfOrderLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_UNSORTED', {
        message: `Rectangular mode selections must be sorted by line number (line ${outOfOrderLine} comes after line ${startLine})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          previousLine: startLine,
          currentLine: outOfOrderLine,
        },
      });
    });

    it('should throw error when middle selection is out of order', () => {
      const outOfOrderDelta = getRandomInt(1, 5);
      const jumpAheadLine = startLine + getRandomInt(outOfOrderDelta + 1, outOfOrderDelta + 5);
      const outOfOrderLine = startLine + outOfOrderDelta;
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: jumpAheadLine, character: startChar },
          end: { line: jumpAheadLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: outOfOrderLine, character: startChar },
          end: { line: outOfOrderLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_UNSORTED', {
        message: `Rectangular mode selections must be sorted by line number (line ${outOfOrderLine} comes after line ${jumpAheadLine})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 2,
          previousLine: jumpAheadLine,
          currentLine: outOfOrderLine,
        },
      });
    });

    it('should not throw for properly sorted selections', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: startChar },
          end: { line: startLine + 1, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 2, character: startChar },
          end: { line: startLine + 2, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });
  });

  describe('Contiguous lines requirement', () => {
    it('should throw error for non-contiguous lines (gap of 1)', () => {
      const gap = getRandomInt(1, 5);
      const skippedLine = startLine + gap + 1;
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: skippedLine, character: startChar },
          end: { line: skippedLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_NON_CONTIGUOUS', {
        message: `Rectangular mode requires contiguous lines (gap between line ${startLine} and ${skippedLine})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          previousLine: startLine,
          currentLine: skippedLine,
          gap,
        },
      });
    });

    it('should throw error for non-contiguous lines (gap of 5)', () => {
      const gap = getRandomInt(5, 10);
      const skippedLine = startLine + gap + 1;
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: skippedLine, character: startChar },
          end: { line: skippedLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowDetailedError('SELECTION_RECTANGULAR_NON_CONTIGUOUS', {
        message: `Rectangular mode requires contiguous lines (gap between line ${startLine} and ${skippedLine})`,
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          previousLine: startLine,
          currentLine: skippedLine,
          gap,
        },
      });
    });

    it('should not throw for contiguous lines', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: startChar },
          end: { line: startLine + 1, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 2, character: startChar },
          end: { line: startLine + 2, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 3, character: startChar },
          end: { line: startLine + 3, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });
  });

  describe('Valid rectangular selections', () => {
    it('should not throw for single valid rectangular selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });

    it('should not throw for valid rectangular block (3 lines)', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: startChar },
          end: { line: startLine + 1, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 2, character: startChar },
          end: { line: startLine + 2, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });

    it('should not throw for valid rectangular block starting at line 0', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 0, character: 0 },
          end: { line: 0, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 1, character: 0 },
          end: { line: 1, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });

    it('should not throw for large rectangular block (10 lines)', () => {
      const selections: InputSelection['selections'] = Array.from({ length: 10 }, (_, i) => ({
        start: { line: startLine + i, character: startChar },
        end: { line: startLine + i, character: endChar },
        coverage: SelectionCoverage.PartialLine,
      }));

      validateRectangularMode(selections);
    });
  });
});
