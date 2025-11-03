import { buildAnchor } from '../../formatting/buildAnchor';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { RangeFormat } from '../../types/RangeFormat';

describe('buildAnchor', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  describe('with positions', () => {
    it('should build anchor with positions', () => {
      const result = buildAnchor(11, 21, 6, 16, defaultDelimiters, RangeFormat.WithPositions);
      expect(result).toBe('L11C6-L21C16');
    });

    it('should default to WithPositions format when not specified', () => {
      const result = buildAnchor(11, 21, 6, 16, defaultDelimiters);
      expect(result).toBe('L11C6-L21C16');
    });

    it('should default to position 1 when positions are undefined', () => {
      const result = buildAnchor(
        11,
        21,
        undefined,
        undefined,
        defaultDelimiters,
        RangeFormat.WithPositions,
      );
      expect(result).toBe('L11C1-L21C1');
    });

    it('should work with custom delimiters', () => {
      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '#',
        range: 'TO',
      };
      const result = buildAnchor(10, 20, 5, 15, customDelimiters, RangeFormat.WithPositions);
      expect(result).toBe('LINE10COL5TOLINE20COL15');
    });
  });

  describe('line only', () => {
    it('should build anchor without positions', () => {
      const result = buildAnchor(11, 21, 6, 16, defaultDelimiters, RangeFormat.LineOnly);
      expect(result).toBe('L11-L21');
    });

    it('should ignore position values when format is LineOnly', () => {
      const result = buildAnchor(
        11,
        21,
        undefined,
        undefined,
        defaultDelimiters,
        RangeFormat.LineOnly,
      );
      expect(result).toBe('L11-L21');
    });

    it('should work with custom delimiters for line-only format', () => {
      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '>',
        range: 'thru',
      };
      const result = buildAnchor(
        10,
        20,
        undefined,
        undefined,
        customDelimiters,
        RangeFormat.LineOnly,
      );
      expect(result).toBe('LINE10thruLINE20');
    });
  });

  describe('single line', () => {
    it('should handle single-line selection with positions', () => {
      const result = buildAnchor(11, 11, 6, 16, defaultDelimiters, RangeFormat.WithPositions);
      expect(result).toBe('L11C6-L11C16');
    });

    it('should handle single-line selection without positions', () => {
      const result = buildAnchor(
        11,
        11,
        undefined,
        undefined,
        defaultDelimiters,
        RangeFormat.LineOnly,
      );
      expect(result).toBe('L11-L11');
    });
  });
});
