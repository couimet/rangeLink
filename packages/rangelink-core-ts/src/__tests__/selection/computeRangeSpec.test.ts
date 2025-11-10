import { computeRangeSpec } from '../../selection/computeRangeSpec';
import * as validateInputSelectionModule from '../../selection/validateInputSelection';
import { InputSelection } from '../../types/InputSelection';
import { RangeFormat } from '../../types/RangeFormat';
import { RangeNotation } from '../../types/RangeNotation';
import { SelectionCoverage } from '../../types/SelectionCoverage';
import { SelectionType } from '../../types/SelectionType';

describe('computeRangeSpec', () => {
  describe('Default behavior (no options)', () => {
    it('should default to Auto notation for PartialLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection);

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 11,
          startPosition: 6,
          endPosition: 16,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should default to Auto notation for FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 0 },

            end: { line: 10, char: 50 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection);

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 11,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });
  });

  describe('Auto notation - Normal selections', () => {
    it('should use WithPositions format for partial line coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11, // 1-based
          endLine: 11,
          startPosition: 6, // 1-based
          endPosition: 16,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should use WithPositions format for multi-line partial selection', () => {
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
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 21,
          startPosition: 6,
          endPosition: 16,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should use LineOnly format when all selections have FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 0 },

            end: { line: 15, char: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 16,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });

    it('should use LineOnly format for single line with FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 0 },

            end: { line: 10, char: 50 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 11,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });
  });

  describe('Auto notation - Rectangular selections', () => {
    it('should always use WithPositions and double-hash for rectangular mode', () => {
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
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 13, // Last selection line
          startPosition: 6,
          endPosition: 16,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should use first and last selection lines for rectangular mode', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 9, char: 10 },

            end: { line: 9, char: 20 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 10, char: 10 },

            end: { line: 10, char: 20 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 11, char: 10 },

            end: { line: 11, char: 20 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 10, // First selection + 1
          endLine: 12, // Last selection + 1
          startPosition: 11,
          endPosition: 21,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });
  });

  describe('EnforceFullLine notation', () => {
    it('should use LineOnly format even for PartialLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforceFullLine });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 11,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });

    it('should discard position information for multi-line partial selection', () => {
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
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforceFullLine });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 21,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });

    it('should use LineOnly format for FullLine coverage (consistent with Auto)', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 0 },

            end: { line: 15, char: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforceFullLine });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 16,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });
  });

  describe('EnforcePositions notation', () => {
    it('should use WithPositions format even for FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 0 },

            end: { line: 10, char: 50 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforcePositions });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 11,
          startPosition: 1,
          endPosition: 51,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should include positions for multi-line FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 0 },

            end: { line: 15, char: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforcePositions });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 16,
          startPosition: 1,
          endPosition: 1,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should use WithPositions format for PartialLine coverage (consistent with Auto)', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },

            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforcePositions });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 11,
          startPosition: 6,
          endPosition: 16,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });
  });

  describe('Error handling', () => {
    it('should return Err Result when validateInputSelection throws RangeLinkError', () => {
      // Create invalid input that will cause validateInputSelection to throw RangeLinkError
      const inputSelection: InputSelection = {
        selections: [], // Empty selections array is invalid
        selectionType: SelectionType.Normal,
      };

      const result = computeRangeSpec(inputSelection);

      expect(result).toBeRangeLinkErrorErr('SELECTION_EMPTY', {
        message: 'Selections array must not be empty',
        functionName: 'validateInputSelection',
      });
    });

    it('should re-throw unexpected errors from validateInputSelection', () => {
      // Input doesn't matter - mock will intercept before validation
      const inputSelection = {} as InputSelection;

      // Define expected error as test-scoped constant
      const expectedError = new TypeError('Unexpected validation error');

      // Mock validateInputSelection to throw unexpected error
      const spy = jest
        .spyOn(validateInputSelectionModule, 'validateInputSelection')
        .mockImplementationOnce(() => {
          throw expectedError;
        });

      expect(() => computeRangeSpec(inputSelection)).toThrow(expectedError);

      // Verify spy was called with the input (validates integration point)
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(inputSelection);
    });
  });
});
