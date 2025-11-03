import { HashMode } from '../../types/HashMode';
import { LinkType } from '../../types/LinkType';
import { PathFormat } from '../../types/PathFormat';
import { RangeFormat } from '../../types/RangeFormat';
import { RangeNotation } from '../../types/RangeNotation';
import { SelectionCoverage } from '../../types/SelectionCoverage';

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

  describe('LinkType', () => {
    it('should have exactly 2 values', () => {
      expect(Object.keys(LinkType)).toHaveLength(2);
    });

    it('should have Regular value', () => {
      expect(LinkType.Regular).toBe('regular');
    });

    it('should have Portable value', () => {
      expect(LinkType.Portable).toBe('portable');
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

  describe('RangeNotation', () => {
    it('should have exactly 3 values', () => {
      expect(Object.keys(RangeNotation)).toHaveLength(3);
    });

    it('should have Auto value', () => {
      expect(RangeNotation.Auto).toBe('Auto');
    });

    it('should have EnforceFullLine value', () => {
      expect(RangeNotation.EnforceFullLine).toBe('EnforceFullLine');
    });

    it('should have EnforcePositions value', () => {
      expect(RangeNotation.EnforcePositions).toBe('EnforcePositions');
    });
  });

  describe('SelectionCoverage', () => {
    it('should have exactly 2 values', () => {
      expect(Object.keys(SelectionCoverage)).toHaveLength(2);
    });

    it('should have FullLine value', () => {
      expect(SelectionCoverage.FullLine).toBe('FullLine');
    });

    it('should have PartialLine value', () => {
      expect(SelectionCoverage.PartialLine).toBe('PartialLine');
    });
  });
});
