import { computeRangeSpec } from '../../selection/computeRangeSpec';
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
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
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
          selectionType: SelectionType.Normal,
        });
      });
    });

    it('should default to Auto notation for FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 0,
            endLine: 10,
            endCharacter: 50,
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
          startPosition: undefined,
          endPosition: undefined,
          rangeFormat: RangeFormat.LineOnly,
          selectionType: SelectionType.Normal,
        });
      });
    });
  });

  describe('Auto notation - Normal selections', () => {
    it('should use WithPositions format for partial line coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
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
          selectionType: SelectionType.Normal,
        });
      });
    });

    it('should use WithPositions format for multi-line partial selection', () => {
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
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 21,
          startPosition: 6,
          endPosition: 16,
          rangeFormat: RangeFormat.WithPositions,
          selectionType: SelectionType.Normal,
        });
      });
    });

    it('should use LineOnly format when all selections have FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 0,
            endLine: 15,
            endCharacter: 0,
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
          startPosition: undefined,
          endPosition: undefined,
          rangeFormat: RangeFormat.LineOnly,
          selectionType: SelectionType.Normal,
        });
      });
    });

    it('should use LineOnly format for single line with FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 0,
            endLine: 10,
            endCharacter: 50,
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
          startPosition: undefined,
          endPosition: undefined,
          rangeFormat: RangeFormat.LineOnly,
          selectionType: SelectionType.Normal,
        });
      });
    });
  });

  describe('Auto notation - Rectangular selections', () => {
    it('should always use WithPositions and double-hash for rectangular mode', () => {
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
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.Auto });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 13, // Last selection line
          startPosition: 6,
          endPosition: 16,
          rangeFormat: RangeFormat.WithPositions,
          selectionType: SelectionType.Rectangular,
        });
      });
    });

    it('should use first and last selection lines for rectangular mode', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 9,
            startCharacter: 10,
            endLine: 9,
            endCharacter: 20,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 10,
            startCharacter: 10,
            endLine: 10,
            endCharacter: 20,
            coverage: SelectionCoverage.PartialLine,
          },
          {
            startLine: 11,
            startCharacter: 10,
            endLine: 11,
            endCharacter: 20,
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
          selectionType: SelectionType.Rectangular,
        });
      });
    });
  });

  describe('EnforceFullLine notation', () => {
    it('should use LineOnly format even for PartialLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
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
          startPosition: undefined,
          endPosition: undefined,
          rangeFormat: RangeFormat.LineOnly,
          selectionType: SelectionType.Normal,
        });
      });
    });

    it('should discard position information for multi-line partial selection', () => {
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
      const result = computeRangeSpec(inputSelection, { notation: RangeNotation.EnforceFullLine });

      expect(result).toBeOkWith((value) => {
        expect(value).toStrictEqual({
          startLine: 11,
          endLine: 21,
          startPosition: undefined,
          endPosition: undefined,
          rangeFormat: RangeFormat.LineOnly,
          selectionType: SelectionType.Normal,
        });
      });
    });

    it('should use LineOnly format for FullLine coverage (consistent with Auto)', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 0,
            endLine: 15,
            endCharacter: 0,
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
          startPosition: undefined,
          endPosition: undefined,
          rangeFormat: RangeFormat.LineOnly,
          selectionType: SelectionType.Normal,
        });
      });
    });
  });

  describe('EnforcePositions notation', () => {
    it('should use WithPositions format even for FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 0,
            endLine: 10,
            endCharacter: 50,
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
          selectionType: SelectionType.Normal,
        });
      });
    });

    it('should include positions for multi-line FullLine coverage', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 0,
            endLine: 15,
            endCharacter: 0,
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
          selectionType: SelectionType.Normal,
        });
      });
    });

    it('should use WithPositions format for PartialLine coverage (consistent with Auto)', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            startLine: 10,
            startCharacter: 5,
            endLine: 10,
            endCharacter: 15,
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
          selectionType: SelectionType.Normal,
        });
      });
    });
  });
});
