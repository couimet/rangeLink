import { validateRectangularMode } from '../../selection/validateRectangularMode';
import { InputSelection } from '../../types/InputSelection';
import { SelectionCoverage } from '../../types/SelectionCoverage';

describe('validateRectangularMode', () => {
  describe('Empty selections array (defensive guard)', () => {
    it('should return early for empty array without throwing', () => {
      const selections: InputSelection['selections'] = [];

      // This tests the defensive guard at line 127 (now line 18 in new module)
      // Should not throw - just returns early
      validateRectangularMode(selections);
    });
  });

  describe('Single-line requirement', () => {
    it('should throw error when selection spans multiple lines', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 12, character: 15 }, // Multi-line
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_MULTILINE',
        {
          message:
            'Rectangular mode requires single-line selections (selection 0 spans lines 10-12)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 0,
            startLine: 10,
            endLine: 12,
          },
        },
      );
    });

    it('should throw error for second selection spanning multiple lines', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 11, character: 5 },
          end: { line: 13, character: 15 }, // Multi-line
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_MULTILINE',
        {
          message:
            'Rectangular mode requires single-line selections (selection 1 spans lines 11-13)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 1,
            startLine: 11,
            endLine: 13,
          },
        },
      );
    });

    it('should not throw for valid single-line selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });
  });

  describe('Consistent column range requirement', () => {
    it('should throw error for mismatched startCharacter', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 11, character: 7 }, // Mismatched
          end: { line: 11, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_MISMATCHED_COLUMNS',
        {
          message:
            'Rectangular mode requires consistent column range (expected 5-15, got 7-15 at selection 1)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 1,
            expectedStartCharacter: 5,
            expectedEndCharacter: 15,
            actualStartCharacter: 7,
            actualEndCharacter: 15,
          },
        },
      );
    });

    it('should throw error for mismatched endCharacter', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 11, character: 5 },
          end: { line: 11, character: 17 }, // Mismatched
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_MISMATCHED_COLUMNS',
        {
          message:
            'Rectangular mode requires consistent column range (expected 5-15, got 5-17 at selection 1)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 1,
            expectedStartCharacter: 5,
            expectedEndCharacter: 15,
            actualStartCharacter: 5,
            actualEndCharacter: 17,
          },
        },
      );
    });

    it('should throw error for both startCharacter and endCharacter mismatched', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 11, character: 3 }, // Both mismatched
          end: { line: 11, character: 20 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_MISMATCHED_COLUMNS',
        {
          message:
            'Rectangular mode requires consistent column range (expected 5-15, got 3-20 at selection 1)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 1,
            expectedStartCharacter: 5,
            expectedEndCharacter: 15,
            actualStartCharacter: 3,
            actualEndCharacter: 20,
          },
        },
      );
    });

    it('should not throw for consistent column ranges', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 11, character: 5 },
          end: { line: 11, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 12, character: 5 },
          end: { line: 12, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });
  });

  describe('Sorted by line number requirement', () => {
    it('should throw error for unsorted selections', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 8, character: 5 }, // Out of order
          end: { line: 8, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_UNSORTED',
        {
          message:
            'Rectangular mode selections must be sorted by line number (line 8 comes after line 10)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 1,
            previousLine: 10,
            currentLine: 8,
          },
        },
      );
    });

    it('should throw error when middle selection is out of order', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 15, character: 5 }, // Jump ahead
          end: { line: 15, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 12, character: 5 }, // Out of order
          end: { line: 12, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_UNSORTED',
        {
          message:
            'Rectangular mode selections must be sorted by line number (line 12 comes after line 15)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 2,
            previousLine: 15,
            currentLine: 12,
          },
        },
      );
    });

    it('should not throw for properly sorted selections', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 11, character: 5 },
          end: { line: 11, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 12, character: 5 },
          end: { line: 12, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });
  });

  describe('Contiguous lines requirement', () => {
    it('should throw error for non-contiguous lines (gap of 1)', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 12, character: 5 }, // Gap (missing line 11)
          end: { line: 12, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_NON_CONTIGUOUS',
        {
          message: 'Rectangular mode requires contiguous lines (gap between line 10 and 12)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 1,
            previousLine: 10,
            currentLine: 12,
            gap: 1,
          },
        },
      );
    });

    it('should throw error for non-contiguous lines (gap of 5)', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 16, character: 5 }, // Gap (missing lines 11-15)
          end: { line: 16, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateRectangularMode(selections)).toThrowRangeLinkError(
        'SELECTION_RECTANGULAR_NON_CONTIGUOUS',
        {
          message: 'Rectangular mode requires contiguous lines (gap between line 10 and 16)',
          functionName: 'validateRectangularMode',
          details: {
            selectionIndex: 1,
            previousLine: 10,
            currentLine: 16,
            gap: 5,
          },
        },
      );
    });

    it('should not throw for contiguous lines', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 11, character: 5 },
          end: { line: 11, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 12, character: 5 },
          end: { line: 12, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 13, character: 5 },
          end: { line: 13, character: 15 },
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
          start: { line: 42, character: 10 },
          end: { line: 42, character: 20 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });

    it('should not throw for valid rectangular block (3 lines)', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 11, character: 5 },
          end: { line: 11, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 12, character: 5 },
          end: { line: 12, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });

    it('should not throw for valid rectangular block starting at line 0', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 10 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateRectangularMode(selections);
    });

    it('should not throw for large rectangular block (10 lines)', () => {
      const selections: InputSelection['selections'] = Array.from({ length: 10 }, (_, i) => ({
        start: { line: 100 + i, character: 20 },
        end: { line: 100 + i, character: 50 },
        coverage: SelectionCoverage.PartialLine,
      }));

      validateRectangularMode(selections);
    });
  });
});
