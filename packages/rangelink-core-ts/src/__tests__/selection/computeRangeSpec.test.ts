import { HashMode } from '../../types/HashMode';
import { RangeFormat } from '../../types/RangeFormat';
import { Selection } from '../../types/Selection';
import { computeRangeSpec } from '../../selection/computeRangeSpec';

describe('computeRangeSpec', () => {
  describe('regular selections', () => {
    it('should compute spec for single-line selection with positions', () => {
      const selections: Selection[] = [
        { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
      ];
      const result = computeRangeSpec(selections);

      expect(result).toEqual({
        startLine: 11, // 1-based
        endLine: 11,
        startPosition: 6, // 1-based
        endPosition: 16,
        rangeFormat: RangeFormat.WithPositions,
        hashMode: HashMode.Normal,
      });
    });

    it('should compute spec for multi-line selection', () => {
      const selections: Selection[] = [
        { startLine: 10, startCharacter: 5, endLine: 20, endCharacter: 15 },
      ];
      const result = computeRangeSpec(selections);

      expect(result).toEqual({
        startLine: 11,
        endLine: 21,
        startPosition: 6,
        endPosition: 16,
        rangeFormat: RangeFormat.WithPositions,
        hashMode: HashMode.Normal,
      });
    });

    it('should use LineOnly format for full-block selection (0,0 to 0,0)', () => {
      const selections: Selection[] = [
        { startLine: 10, startCharacter: 0, endLine: 15, endCharacter: 0 },
      ];
      const result = computeRangeSpec(selections);

      expect(result).toEqual({
        startLine: 11,
        endLine: 16,
        startPosition: undefined,
        endPosition: undefined,
        rangeFormat: RangeFormat.LineOnly,
        hashMode: HashMode.Normal,
      });
    });

    it('should use LineOnly format when isFullLine option is true', () => {
      const selections: Selection[] = [
        { startLine: 10, startCharacter: 0, endLine: 10, endCharacter: 50 },
      ];
      const result = computeRangeSpec(selections, { isFullLine: true });

      expect(result).toEqual({
        startLine: 11,
        endLine: 11,
        startPosition: undefined,
        endPosition: undefined,
        rangeFormat: RangeFormat.LineOnly,
        hashMode: HashMode.Normal,
      });
    });
  });

  describe('rectangular mode selections', () => {
    it('should detect rectangular mode for multiple selections with same char range', () => {
      const selections: Selection[] = [
        { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
        { startLine: 11, startCharacter: 5, endLine: 11, endCharacter: 15 },
        { startLine: 12, startCharacter: 5, endLine: 12, endCharacter: 15 },
      ];
      const result = computeRangeSpec(selections);

      expect(result).toEqual({
        startLine: 11,
        endLine: 13, // Last selection line
        startPosition: 6,
        endPosition: 16,
        rangeFormat: RangeFormat.WithPositions,
        hashMode: HashMode.RectangularMode,
      });
    });

    it('should use first and last selection lines for rectangular mode', () => {
      const selections: Selection[] = [
        { startLine: 9, startCharacter: 10, endLine: 9, endCharacter: 20 },
        { startLine: 10, startCharacter: 10, endLine: 10, endCharacter: 20 },
        { startLine: 11, startCharacter: 10, endLine: 11, endCharacter: 20 },
      ];
      const result = computeRangeSpec(selections);

      expect(result).toEqual({
        startLine: 10, // First selection + 1
        endLine: 12, // Last selection + 1
        startPosition: 11,
        endPosition: 21,
        rangeFormat: RangeFormat.WithPositions,
        hashMode: HashMode.RectangularMode,
      });
    });
  });
});

