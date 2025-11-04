import { SelectionValidationError } from '../../errors/SelectionValidationError';
import { validateInputSelection } from '../../selection/validateInputSelection';
import { InputSelection } from '../../types/InputSelection';
import { RangeLinkMessageCode } from '../../types/RangeLinkMessageCode';
import { SelectionCoverage } from '../../types/SelectionCoverage';
import { SelectionType } from '../../types/SelectionType';

describe('validateInputSelection', () => {
  describe('ERR_3001: Empty selections array', () => {
    it('should throw error for empty selections array', () => {
      const inputSelection: InputSelection = {
        selections: [],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3001\] Selections array must not be empty/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_EMPTY,
        );
      }
    });
  });

  describe('ERR_3002: Normal mode multiple selections', () => {
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3002\] Normal mode does not support multiple selections/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_NORMAL_MULTIPLE,
        );
      }
    });
  });

  describe('ERR_3003: Backward line selection', () => {
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3003\] Backward selection not allowed/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_BACKWARD_LINE,
        );
      }
    });
  });

  describe('ERR_3004: Backward character selection', () => {
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3004\] Backward character selection not allowed/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_BACKWARD_CHARACTER,
        );
      }
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

  describe('ERR_3005: Negative coordinates', () => {
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3005\] Negative coordinates not allowed/,
      );
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

      expect(() => validateInputSelection(inputSelection)).toThrow(/ERR_3005/);
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

      expect(() => validateInputSelection(inputSelection)).toThrow(/ERR_3005/);
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

      expect(() => validateInputSelection(inputSelection)).toThrow(/ERR_3005/);
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3006\] Rectangular mode selections must be sorted by line number/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_UNSORTED,
        );
      }
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3007\] Rectangular mode requires single-line selections/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_MULTILINE,
        );
      }
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3008\] Rectangular mode requires consistent column range/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_MISMATCHED_COLUMNS,
        );
      }
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

      expect(() => validateInputSelection(inputSelection)).toThrow(/ERR_3008/);
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3009\] Rectangular mode requires contiguous lines/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_RECTANGULAR_NON_CONTIGUOUS,
        );
      }
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3010\] Unknown SelectionType: "InvalidType"/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_UNKNOWN_TYPE,
        );
      }
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

      expect(() => validateInputSelection(inputSelection)).toThrow(SelectionValidationError);
      expect(() => validateInputSelection(inputSelection)).toThrow(
        /\[ERROR\] \[ERR_3011\] Zero-width selection not allowed/,
      );

      try {
        validateInputSelection(inputSelection);
      } catch (error) {
        expect(error).toBeInstanceOf(SelectionValidationError);
        expect((error as SelectionValidationError).code).toBe(
          RangeLinkMessageCode.SELECTION_ERR_ZERO_WIDTH,
        );
      }
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

      expect(() => validateInputSelection(inputSelection)).toThrow(/ERR_3011/);
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
