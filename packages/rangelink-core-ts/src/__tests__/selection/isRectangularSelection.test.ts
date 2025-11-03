import { isRectangularSelection } from '../../selection/isRectangularSelection';
import { Selection } from '../../types/Selection';

describe('isRectangularSelection', () => {
  it('should return false for single selection', () => {
    const selections: Selection[] = [
      { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
    ];
    expect(isRectangularSelection(selections)).toBe(false);
  });

  it('should return true for multiple selections with same character range on consecutive lines', () => {
    const selections: Selection[] = [
      { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
      { startLine: 11, startCharacter: 5, endLine: 11, endCharacter: 15 },
      { startLine: 12, startCharacter: 5, endLine: 12, endCharacter: 15 },
    ];
    expect(isRectangularSelection(selections)).toBe(true);
  });

  it('should return false for multiple selections with different character ranges', () => {
    const selections: Selection[] = [
      { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
      { startLine: 11, startCharacter: 6, endLine: 11, endCharacter: 16 },
    ];
    expect(isRectangularSelection(selections)).toBe(false);
  });

  it('should return false for selections on non-consecutive lines', () => {
    const selections: Selection[] = [
      { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
      { startLine: 12, startCharacter: 5, endLine: 12, endCharacter: 15 },
    ];
    expect(isRectangularSelection(selections)).toBe(false);
  });

  it('should handle selections in random order and sort by line', () => {
    const selections: Selection[] = [
      { startLine: 12, startCharacter: 5, endLine: 12, endCharacter: 15 },
      { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
      { startLine: 11, startCharacter: 5, endLine: 11, endCharacter: 15 },
    ];
    expect(isRectangularSelection(selections)).toBe(true);
  });

  it('should return false for selections with different start characters', () => {
    const selections: Selection[] = [
      { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
      { startLine: 11, startCharacter: 6, endLine: 11, endCharacter: 15 },
    ];
    expect(isRectangularSelection(selections)).toBe(false);
  });

  it('should return false for selections with different end characters', () => {
    const selections: Selection[] = [
      { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
      { startLine: 11, startCharacter: 5, endLine: 11, endCharacter: 16 },
    ];
    expect(isRectangularSelection(selections)).toBe(false);
  });
});
