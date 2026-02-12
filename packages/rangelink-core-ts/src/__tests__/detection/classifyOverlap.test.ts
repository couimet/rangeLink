import { classifyOverlap } from '../../detection/classifyOverlap';

describe('classifyOverlap', () => {
  describe('no overlap', () => {
    it('should return none when occupiedRanges is empty', () => {
      const result = classifyOverlap(10, 20, []);

      expect(result).toStrictEqual({ type: 'none' });
    });

    it('should return none when candidate is before all ranges', () => {
      const result = classifyOverlap(0, 5, [{ start: 10, end: 20 }]);

      expect(result).toStrictEqual({ type: 'none' });
    });

    it('should return none when candidate is after all ranges', () => {
      const result = classifyOverlap(30, 40, [{ start: 10, end: 20 }]);

      expect(result).toStrictEqual({ type: 'none' });
    });

    it('should return none when candidate is between ranges', () => {
      const result = classifyOverlap(15, 20, [
        { start: 0, end: 10 },
        { start: 25, end: 35 },
      ]);

      expect(result).toStrictEqual({ type: 'none' });
    });

    it('should return none when candidate is adjacent (touching but not overlapping)', () => {
      const result = classifyOverlap(20, 30, [{ start: 10, end: 20 }]);

      expect(result).toStrictEqual({ type: 'none' });
    });
  });

  describe('partial overlap', () => {
    it('should return partial when candidate starts before and ends inside range', () => {
      const result = classifyOverlap(5, 15, [{ start: 10, end: 20 }]);

      expect(result).toStrictEqual({ type: 'partial' });
    });

    it('should return partial when candidate starts inside and ends after range', () => {
      const result = classifyOverlap(15, 25, [{ start: 10, end: 20 }]);

      expect(result).toStrictEqual({ type: 'partial' });
    });

    it('should return partial when candidate is contained within range', () => {
      const result = classifyOverlap(12, 18, [{ start: 10, end: 20 }]);

      expect(result).toStrictEqual({ type: 'partial' });
    });

    it('should return partial even if earlier ranges were encompassed', () => {
      const result = classifyOverlap(5, 25, [
        { start: 6, end: 10 },
        { start: 8, end: 30 },
      ]);

      expect(result).toStrictEqual({ type: 'partial' });
    });
  });

  describe('encompassing', () => {
    it('should return encompassing when candidate fully wraps a single range', () => {
      const result = classifyOverlap(5, 25, [{ start: 10, end: 20 }]);

      expect(result).toStrictEqual({ type: 'encompassing', encompassedIndices: [0] });
    });

    it('should return encompassing when candidate exactly matches range', () => {
      const result = classifyOverlap(10, 20, [{ start: 10, end: 20 }]);

      expect(result).toStrictEqual({ type: 'encompassing', encompassedIndices: [0] });
    });

    it('should return encompassing with multiple ranges fully wrapped', () => {
      const result = classifyOverlap(0, 50, [
        { start: 5, end: 15 },
        { start: 20, end: 30 },
        { start: 35, end: 45 },
      ]);

      expect(result).toStrictEqual({ type: 'encompassing', encompassedIndices: [0, 1, 2] });
    });

    it('should only include actually encompassed indices (skip non-overlapping)', () => {
      const result = classifyOverlap(5, 25, [
        { start: 0, end: 3 },
        { start: 10, end: 20 },
        { start: 30, end: 40 },
      ]);

      expect(result).toStrictEqual({ type: 'encompassing', encompassedIndices: [1] });
    });
  });
});
