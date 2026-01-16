import { isRectangularSelection } from '../isRectangularSelection';

/**
 * Helper to create a mock vscode.Selection
 * We create plain objects that match the vscode.Selection interface
 */
function createSelection(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
): any {
  return {
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
    anchor: { line: startLine, character: startCharacter },
    active: { line: endLine, character: endCharacter },
    isReversed: false,
    isEmpty: startLine === endLine && startCharacter === endCharacter,
  };
}

describe('isRectangularSelection', () => {
  describe('Insufficient selections (< 2)', () => {
    it('should return false for empty array', () => {
      expect(isRectangularSelection([])).toBe(false);
    });

    it('should return false for single selection', () => {
      const selections = [createSelection(5, 10, 5, 20)];
      expect(isRectangularSelection(selections)).toBe(false);
    });
  });

  describe('Character range mismatches', () => {
    it('should return false when start characters differ', () => {
      const selections = [
        createSelection(5, 10, 5, 20), // start: 10
        createSelection(6, 12, 6, 20), // start: 12 (different!)
        createSelection(7, 10, 7, 20),
      ];
      expect(isRectangularSelection(selections)).toBe(false);
    });

    it('should return false when end characters differ', () => {
      const selections = [
        createSelection(5, 10, 5, 20), // end: 20
        createSelection(6, 10, 6, 25), // end: 25 (different!)
        createSelection(7, 10, 7, 20),
      ];
      expect(isRectangularSelection(selections)).toBe(false);
    });

    it('should return false when both start and end characters differ', () => {
      const selections = [
        createSelection(5, 10, 5, 20),
        createSelection(6, 5, 6, 30), // Both differ
        createSelection(7, 10, 7, 20),
      ];
      expect(isRectangularSelection(selections)).toBe(false);
    });
  });

  describe('Non-consecutive lines', () => {
    it('should return false when lines have gaps', () => {
      const selections = [
        createSelection(5, 10, 5, 20),
        createSelection(6, 10, 6, 20),
        createSelection(8, 10, 8, 20), // Gap: 6 -> 8 (not consecutive)
      ];
      expect(isRectangularSelection(selections)).toBe(false);
    });

    it('should return false when first pair is non-consecutive', () => {
      const selections = [
        createSelection(5, 10, 5, 20),
        createSelection(7, 10, 7, 20), // Gap: 5 -> 7
        createSelection(8, 10, 8, 20),
      ];
      expect(isRectangularSelection(selections)).toBe(false);
    });

    it('should return false when last pair is non-consecutive', () => {
      const selections = [
        createSelection(5, 10, 5, 20),
        createSelection(6, 10, 6, 20),
        createSelection(10, 10, 10, 20), // Gap: 6 -> 10
      ];
      expect(isRectangularSelection(selections)).toBe(false);
    });

    it('should return false for duplicate line numbers', () => {
      const selections = [
        createSelection(5, 10, 5, 20),
        createSelection(5, 10, 5, 20), // Duplicate line 5
        createSelection(6, 10, 6, 20),
      ];
      expect(isRectangularSelection(selections)).toBe(false);
    });
  });

  describe('Valid rectangular selections', () => {
    it('should return true for 2 consecutive lines with same character range', () => {
      const selections = [createSelection(5, 10, 5, 20), createSelection(6, 10, 6, 20)];
      expect(isRectangularSelection(selections)).toBe(true);
    });

    it('should return true for 3 consecutive lines with same character range', () => {
      const selections = [
        createSelection(10, 5, 10, 15),
        createSelection(11, 5, 11, 15),
        createSelection(12, 5, 12, 15),
      ];
      expect(isRectangularSelection(selections)).toBe(true);
    });

    it('should return true for many consecutive lines (10+)', () => {
      const selections = Array.from({ length: 15 }, (_, i) => createSelection(i, 10, i, 20));
      expect(isRectangularSelection(selections)).toBe(true);
    });

    it('should return true when selections are provided in reverse order', () => {
      // The function sorts lines, so order shouldn't matter
      const selections = [
        createSelection(12, 5, 12, 15),
        createSelection(11, 5, 11, 15),
        createSelection(10, 5, 10, 15),
      ];
      expect(isRectangularSelection(selections)).toBe(true);
    });

    it('should return true when selections are in random order', () => {
      const selections = [
        createSelection(7, 10, 7, 20),
        createSelection(5, 10, 5, 20),
        createSelection(6, 10, 6, 20),
        createSelection(8, 10, 8, 20),
      ];
      expect(isRectangularSelection(selections)).toBe(true);
    });

    it('should return true for selections starting at column 0', () => {
      const selections = [createSelection(0, 0, 0, 10), createSelection(1, 0, 1, 10)];
      expect(isRectangularSelection(selections)).toBe(true);
    });

    it('should return true for zero-width rectangular selection (same start/end column)', () => {
      const selections = [
        createSelection(5, 10, 5, 10),
        createSelection(6, 10, 6, 10),
        createSelection(7, 10, 7, 10),
      ];
      expect(isRectangularSelection(selections)).toBe(true);
    });

    it('should return true for large column numbers', () => {
      const selections = [createSelection(100, 500, 100, 600), createSelection(101, 500, 101, 600)];
      expect(isRectangularSelection(selections)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle selections starting at line 0', () => {
      const selections = [
        createSelection(0, 5, 0, 10),
        createSelection(1, 5, 1, 10),
        createSelection(2, 5, 2, 10),
      ];
      expect(isRectangularSelection(selections)).toBe(true);
    });

    it('should return false when only first and last are consecutive but middle is not', () => {
      const selections = [
        createSelection(5, 10, 5, 20),
        createSelection(10, 10, 10, 20), // Gap
        createSelection(11, 10, 11, 20),
      ];
      expect(isRectangularSelection(selections)).toBe(false);
    });
  });
});
