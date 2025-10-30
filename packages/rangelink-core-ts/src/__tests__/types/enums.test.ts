import { HashMode } from '../../types/HashMode';
import { PathFormat } from '../../types/PathFormat';
import { RangeFormat } from '../../types/RangeFormat';

describe('Enums', () => {
  describe('HashMode', () => {
    it('should have Normal value', () => {
      expect(HashMode.Normal).toBe('Normal');
    });

    it('should have ColumnMode value', () => {
      expect(HashMode.ColumnMode).toBe('ColumnMode');
    });
  });

  describe('PathFormat', () => {
    it('should have WorkspaceRelative value', () => {
      expect(PathFormat.WorkspaceRelative).toBe('WorkspaceRelative');
    });

    it('should have Absolute value', () => {
      expect(PathFormat.Absolute).toBe('Absolute');
    });
  });

  describe('RangeFormat', () => {
    it('should have LineOnly value', () => {
      expect(RangeFormat.LineOnly).toBe('LineOnly');
    });

    it('should have WithPositions value', () => {
      expect(RangeFormat.WithPositions).toBe('WithPositions');
    });
  });
});

