import { getUniqueInt } from '@couimet/dynamic-testing';

import { buildAnchor } from '../../formatting/buildAnchor';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { RangeFormat } from '../../types/RangeFormat';

const DEFAULT_DELIMITERS = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
} as const;

describe('buildAnchor', () => {
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

  describe('with positions', () => {
    it('should build anchor with positions', () => {
      const result = buildAnchor(
        startLine,
        endLine,
        startPosition,
        endPosition,
        DEFAULT_DELIMITERS,
        RangeFormat.WithPositions,
      );
      expect(result).toBe(`L${startLine}C${startPosition}-L${endLine}C${endPosition}`);
    });

    it('should default to WithPositions format when not specified', () => {
      const result = buildAnchor(
        startLine,
        endLine,
        startPosition,
        endPosition,
        DEFAULT_DELIMITERS,
      );
      expect(result).toBe(`L${startLine}C${startPosition}-L${endLine}C${endPosition}`);
    });

    it('should default to position 1 when positions are undefined', () => {
      const result = buildAnchor(
        startLine,
        endLine,
        undefined,
        undefined,
        DEFAULT_DELIMITERS,
        RangeFormat.WithPositions,
      );
      expect(result).toBe(`L${startLine}C1-L${endLine}C1`);
    });

    it('should work with custom delimiters', () => {
      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '#',
        range: 'TO',
      };
      const result = buildAnchor(
        startLine,
        endLine,
        startPosition,
        endPosition,
        customDelimiters,
        RangeFormat.WithPositions,
      );
      expect(result).toBe(`LINE${startLine}COL${startPosition}TOLINE${endLine}COL${endPosition}`);
    });
  });

  describe('line only', () => {
    it('should build anchor without positions', () => {
      const result = buildAnchor(
        startLine,
        endLine,
        startPosition,
        endPosition,
        DEFAULT_DELIMITERS,
        RangeFormat.LineOnly,
      );
      expect(result).toBe(`L${startLine}-L${endLine}`);
    });

    it('should ignore position values when format is LineOnly', () => {
      const result = buildAnchor(
        startLine,
        endLine,
        undefined,
        undefined,
        DEFAULT_DELIMITERS,
        RangeFormat.LineOnly,
      );
      expect(result).toBe(`L${startLine}-L${endLine}`);
    });

    it('should work with custom delimiters for line-only format', () => {
      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '>',
        range: 'thru',
      };
      const result = buildAnchor(
        startLine,
        endLine,
        undefined,
        undefined,
        customDelimiters,
        RangeFormat.LineOnly,
      );
      expect(result).toBe(`LINE${startLine}thruLINE${endLine}`);
    });
  });

  describe('single line', () => {
    it('should handle single-line selection with positions', () => {
      const result = buildAnchor(
        startLine,
        startLine,
        startPosition,
        endPosition,
        DEFAULT_DELIMITERS,
        RangeFormat.WithPositions,
      );
      expect(result).toBe(`L${startLine}C${startPosition}-L${startLine}C${endPosition}`);
    });

    it('should handle single-line selection without positions', () => {
      const result = buildAnchor(
        startLine,
        startLine,
        undefined,
        undefined,
        DEFAULT_DELIMITERS,
        RangeFormat.LineOnly,
      );
      expect(result).toBe(`L${startLine}-L${startLine}`);
    });
  });
});
