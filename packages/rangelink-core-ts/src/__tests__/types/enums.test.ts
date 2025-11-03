import { HashMode } from '../../types/HashMode';
import { PathFormat } from '../../types/PathFormat';
import { RangeFormat } from '../../types/RangeFormat';

describe('Enums', () => {
  describe('HashMode', () => {
    it('should have exactly 2 values', () => {
      expect(Object.keys(HashMode)).toHaveLength(2);
    });

    it('should have Normal value', () => {
      expect(HashMode.Normal).toBe('Normal');
    });

    it('should have RectangularMode value', () => {
      expect(HashMode.RectangularMode).toBe('RectangularMode');
    });
  });

  describe('PathFormat', () => {
    it('should have exactly 2 values', () => {
      expect(Object.keys(PathFormat)).toHaveLength(2);
    });

    it('should have WorkspaceRelative value', () => {
      expect(PathFormat.WorkspaceRelative).toBe('WorkspaceRelative');
    });

    it('should have Absolute value', () => {
      expect(PathFormat.Absolute).toBe('Absolute');
    });
  });

  describe('RangeFormat', () => {
    it('should have exactly 2 values', () => {
      expect(Object.keys(RangeFormat)).toHaveLength(2);
    });

    it('should have LineOnly value', () => {
      expect(RangeFormat.LineOnly).toBe('LineOnly');
    });

    it('should have WithPositions value', () => {
      expect(RangeFormat.WithPositions).toBe('WithPositions');
    });
  });
});
