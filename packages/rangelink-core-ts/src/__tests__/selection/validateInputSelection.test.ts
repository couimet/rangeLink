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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 15,
            startCharacter: 0,
            endLine: 15,
            endCharacter: 10,
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
            startLine: 20,
            startCharacter: 0,
            endLine: 10, // Backward
            endCharacter: 10,
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
            startLine: 10,
            startCharacter: 20,
            endLine: 10,
            endCharacter: 5, // Backward on same line
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
            startLine: 10,
            startCharacter: 20,
            endLine: 15,
            endCharacter: 5, // Different line, OK
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
            startLine: -1,
            startCharacter: 0,
            endLine: 10,
            endCharacter: 10,
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
            startLine: 0,
            startCharacter: 0,
            endLine: -1,
            endCharacter: 10,
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
            startLine: 0,
            startCharacter: -1,
            endLine: 10,
            endCharacter: 10,
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
            startLine: 0,
            startCharacter: 0,
            endLine: 10,
            endCharacter: -1,
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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 8, // Out of order
            startCharacter: 5,
            endLine: 8,
            endCharacter: 15,
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
            startLine: 10,
            startCharacter: 5,
            endLine: 12, // Multi-line
            endCharacter: 15,
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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 11,
            startCharacter: 7, // Mismatched
            endLine: 11,
            endCharacter: 15,
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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 11,
            startCharacter: 5,
            endLine: 11,
            endCharacter: 17, // Mismatched
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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 12, // Gap (missing line 11)
            startCharacter: 5,
            endLine: 12,
            endCharacter: 15,
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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 5, // Same position = zero-width
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
            startLine: 0,
            startCharacter: 0,
            endLine: 0,
            endCharacter: 0,
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
            startLine: 10,
            startCharacter: 5,
            endLine: 20,
            endCharacter: 15,
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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 11,
            startCharacter: 5,
            endLine: 11,
            endCharacter: 15,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 12,
            startCharacter: 5,
            endLine: 12,
            endCharacter: 15,
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      expect(() => validateInputSelection(inputSelection)).not.toThrow();
    });
  });
});
