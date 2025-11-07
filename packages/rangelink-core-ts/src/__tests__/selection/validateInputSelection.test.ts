import { validateInputSelection } from '../../selection/validateInputSelection';
import { InputSelection } from '../../types/InputSelection';
import { SelectionCoverage } from '../../types/SelectionCoverage';
import { SelectionType } from '../../types/SelectionType';

describe('validateInputSelection', () => {
  describe('Empty selections array', () => {
    it('should throw error for empty selections array', () => {
      const inputSelection: InputSelection = {
        selections: [],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_EMPTY', {
        message: 'Selections array must not be empty',
        functionName: 'validateInputSelection',
        details: { selectionsLength: 0 },
      });
    });
  });

  describe('Normal mode multiple selections', () => {
    it('should throw error for multiple selections in Normal mode', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 15, char: 0 },

            end: { line: 15, char: 10 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_NORMAL_MULTIPLE', {
        message:
          'Normal mode does not support multiple selections (got 2). Multiple non-contiguous selections are not yet implemented.',
        functionName: 'validateNormalMode',
        details: { selectionsLength: 2 },
      });
    });
  });

  describe('Backward line selection', () => {
    it('should throw error when startLine > endLine', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 20, char: 0 },
            end: { line: 10, char: 10 }, // Backward
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_BACKWARD_LINE', {
        message: 'Backward selection not allowed (startLine=20 > endLine=10)',
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: 0,
          startLine: 20,
          endLine: 10,
        },
      });
    });
  });

  describe('Backward character selection', () => {
    it('should throw error when startCharacter > endCharacter on same line', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 20 },

            end: { line: 10, char: 5 }, // Backward on same line
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_BACKWARD_CHARACTER', {
        message: 'Backward character selection not allowed (startChar=20 > endChar=5 on line 10)',
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: 0,
          line: 10,
          startChar: 20,
          endChar: 5,
        },
      });
    });

    it('should allow startCharacter > endCharacter when on different lines', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 20 },

            end: { line: 15, char: 5 }, // Different line, OK
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).not.toThrow();
    });
  });

  describe('Negative coordinates', () => {
    it('should throw error for negative startLine', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: -1, char: 0 },

            end: { line: 10, char: 10 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_NEGATIVE_COORDINATES', {
        message:
          'Negative coordinates not allowed (startLine=-1, endLine=10, startChar=0, endChar=10)',
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: 0,
          startLine: -1,
          endLine: 10,
          startChar: 0,
          endChar: 10,
        },
      });
    });

    it('should throw error for negative endLine', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 0, char: 0 },

            end: { line: -1, char: 10 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_NEGATIVE_COORDINATES', {
        message:
          'Negative coordinates not allowed (startLine=0, endLine=-1, startChar=0, endChar=10)',
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: 0,
          startLine: 0,
          endLine: -1,
          startChar: 0,
          endChar: 10,
        },
      });
    });

    it('should throw error for negative startCharacter', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 0, char: -1 },

            end: { line: 10, char: 10 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_NEGATIVE_COORDINATES', {
        message:
          'Negative coordinates not allowed (startLine=0, endLine=10, startChar=-1, endChar=10)',
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: 0,
          startLine: 0,
          endLine: 10,
          startChar: -1,
          endChar: 10,
        },
      });
    });

    it('should throw error for negative endCharacter', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 0, char: 0 },

            end: { line: 10, char: -1 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_NEGATIVE_COORDINATES', {
        message:
          'Negative coordinates not allowed (startLine=0, endLine=10, startChar=0, endChar=-1)',
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: 0,
          startLine: 0,
          endLine: 10,
          startChar: 0,
          endChar: -1,
        },
      });
    });
  });

  describe('ERR_3006: Rectangular mode unsorted selections', () => {
    it('should throw error for unsorted rectangular selections', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 8, char: 5 }, // Out of order
            end: { line: 8, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_RECTANGULAR_UNSORTED', {
        message:
          'Rectangular mode selections must be sorted by line number (line 8 comes after line 10)',
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          previousLine: 10,
          currentLine: 8,
        },
      });
    });
  });

  describe('ERR_3007: Rectangular mode multiline selection', () => {
    it('should throw error when rectangular selection spans multiple lines', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },
            end: { line: 12, char: 15 }, // Multi-line
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_RECTANGULAR_MULTILINE', {
        message: 'Rectangular mode requires single-line selections (selection 0 spans lines 10-12)',
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 0,
          startLine: 10,
          endLine: 12,
        },
      });
    });
  });

  describe('ERR_3008: Rectangular mode mismatched columns', () => {
    it('should throw error for mismatched startCharacter', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 11, char: 7 }, // Mismatched
            end: { line: 11, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_RECTANGULAR_MISMATCHED_COLUMNS', {
        message:
          'Rectangular mode requires consistent column range (expected 5-15, got 7-15 at selection 1)',
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          expectedStartChar: 5,
          expectedEndChar: 15,
          actualStartChar: 7,
          actualEndChar: 15,
        },
      });
    });

    it('should throw error for mismatched endCharacter', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 11, char: 5 },

            end: { line: 11, char: 17 }, // Mismatched
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_RECTANGULAR_MISMATCHED_COLUMNS', {
        message:
          'Rectangular mode requires consistent column range (expected 5-15, got 5-17 at selection 1)',
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          expectedStartChar: 5,
          expectedEndChar: 15,
          actualStartChar: 5,
          actualEndChar: 17,
        },
      });
    });
  });

  describe('ERR_3009: Rectangular mode non-contiguous lines', () => {
    it('should throw error for non-contiguous lines', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 12, char: 5 }, // Gap (missing line 11)
            end: { line: 12, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_RECTANGULAR_NON_CONTIGUOUS', {
        message: 'Rectangular mode requires contiguous lines (gap between line 10 and 12)',
        functionName: 'validateRectangularMode',
        details: {
          selectionIndex: 1,
          previousLine: 10,
          currentLine: 12,
          gap: 1,
        },
      });
    });
  });

  describe('ERR_3010: Unknown SelectionType', () => {
    it('should throw error for unknown SelectionType', () => {
      const inputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: 'InvalidType' as any, // Force invalid type
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_UNKNOWN_TYPE', {
        message: 'Unknown SelectionType: "InvalidType"',
        functionName: 'validateInputSelection',
        details: { selectionType: 'InvalidType' },
      });
    });
  });

  describe('ERR_3011: Zero-width selection', () => {
    it('should throw error for zero-width selection (cursor position)', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 5 }, // Same position = zero-width
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_ZERO_WIDTH', {
        message: 'Zero-width selection not allowed (cursor position at line 10, char 5)',
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: 0,
          line: 10,
          char: 5,
        },
      });
    });

    it('should throw error for zero-width selection at line start', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 0, char: 0 },

            end: { line: 0, char: 0 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError('SELECTION_ZERO_WIDTH', {
        message: 'Zero-width selection not allowed (cursor position at line 0, char 0)',
        functionName: 'validateInputSelection',
        details: {
          selectionIndex: 0,
          line: 0,
          char: 0,
        },
      });
    });
  });

  describe('Valid selections', () => {
    it('should not throw for valid Normal selection', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 20, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).not.toThrow();
    });

    it('should not throw for valid Rectangular selections', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 11, char: 5 },

            end: { line: 11, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 12, char: 5 },

            end: { line: 12, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      expect(() => validateInputSelection(inputSelection)).not.toThrow();
    });
  });
});
