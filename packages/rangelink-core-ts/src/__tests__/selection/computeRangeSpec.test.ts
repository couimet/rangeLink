import { getUniqueInt } from '@couimet/dynamic-testing';

import { computeRangeSpec } from '../../selection/computeRangeSpec';
import * as validateInputSelectionModule from '../../selection/validateInputSelection';
import { InputSelection } from '../../types/InputSelection';
import { RangeFormat } from '../../types/RangeFormat';
import { RangeNotation } from '../../types/RangeNotation';
import { SelectionCoverage } from '../../types/SelectionCoverage';
import { SelectionType } from '../../types/SelectionType';

describe('computeRangeSpec', () => {
  let startLine: number;
  let endLine: number;
  let startPosition: number;
  let endPosition: number;

  beforeEach(() => {
    startLine = getUniqueInt();
    endLine = getUniqueInt();
    startPosition = getUniqueInt();
    endPosition = getUniqueInt();
  });

  describe('Default behavior (no options)', () => {
    it('should default to Auto notation for PartialLine coverage', () => {
      const expectedStartLine = startLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection);

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should default to Auto notation for FullLine coverage', () => {
      const expectedStartLine = startLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection);

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });
  });

  describe('Auto notation - Normal selections', () => {
    it('should use WithPositions format for partial line coverage', () => {
      const expectedStartLine = startLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should use WithPositions format for multi-line partial selection', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: endLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should use LineOnly format when all selections have FullLine coverage', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: endLine, character: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });

    it('should use LineOnly format for single line with FullLine coverage', () => {
      const expectedStartLine = startLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });
  });

  describe('Auto notation - Rectangular selections', () => {
    it('should always use WithPositions and double-hash for rectangular mode', () => {
      const expectedStartLine = startLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 1, character: startPosition },
            end: { line: startLine + 1, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 2, character: startPosition },
            end: { line: startLine + 2, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine + 2,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should use first and last selection lines for rectangular mode', () => {
      const expectedStartLine = startLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 1, character: startPosition },
            end: { line: startLine + 1, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 2, character: startPosition },
            end: { line: startLine + 2, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine + 2,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });
  });

  describe('EnforceFullLine notation', () => {
    it('should use LineOnly format even for PartialLine coverage', () => {
      const expectedStartLine = startLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforceFullLine });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });

    it('should discard position information for multi-line partial selection', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: endLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforceFullLine });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });

    it('should use LineOnly format for FullLine coverage (consistent with Auto)', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: endLine, character: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforceFullLine });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          rangeFormat: RangeFormat.LineOnly,
        });
      });
    });
  });

  describe('EnforcePositions notation', () => {
    it('should use WithPositions format even for FullLine coverage', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforcePositions });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          startPosition: 1,
          endPosition: expectedEndPosition,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should include positions for multi-line FullLine coverage', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: endLine, character: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforcePositions });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          startPosition: 1,
          endPosition: 1,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });

    it('should use WithPositions format for PartialLine coverage (consistent with Auto)', () => {
      const expectedStartLine = startLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforcePositions });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: RangeFormat.WithPositions,
        });
      });
    });
  });

  describe('Error handling', () => {
    it('should return Err Result when validateInputSelection throws RangeLinkError', () => {
      const inputSelection: InputSelection = {
        selections: [],
        selectionType: SelectionType.Normal,
      };

      const result = computeRangeSpec(inputSelection);

      expect(result).toBeRangeLinkErrorErr('SELECTION_EMPTY', {
        message: 'Selections array must not be empty',
        functionName: 'validateInputSelection',
        details: { selectionsLength: 0 },
      });
    });

    it('should re-throw unexpected errors from validateInputSelection', () => {
      const inputSelection = {} as InputSelection;

      const expectedError = new TypeError('Unexpected validation error');

      const spy = jest
        .spyOn(validateInputSelectionModule, 'validateInputSelection')
        .mockImplementationOnce(() => {
          throw expectedError;
        });

      expect(() => computeRangeSpec(inputSelection)).toThrow(expectedError);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(inputSelection);
    });
  });
});
