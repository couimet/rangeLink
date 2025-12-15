import type { LinkPosition } from 'rangelink-core-ts';

import { formatLinkPosition } from '../../utils';

describe('formatLinkPosition', () => {
  describe('Single position (start equals end)', () => {
    it('should format single position with line and character', () => {
      const start: LinkPosition = { line: 42, char: 10 };
      const end: LinkPosition = { line: 42, char: 10 };

      expect(formatLinkPosition(start, end)).toStrictEqual('42:10');
    });

    it('should format single position with line only (no character)', () => {
      const start: LinkPosition = { line: 42 };
      const end: LinkPosition = { line: 42 };

      expect(formatLinkPosition(start, end)).toStrictEqual('42');
    });

    it('should format single position at line 1', () => {
      const start: LinkPosition = { line: 1, char: 1 };
      const end: LinkPosition = { line: 1, char: 1 };

      expect(formatLinkPosition(start, end)).toStrictEqual('1:1');
    });
  });

  describe('Range on different lines', () => {
    it('should format range with both line and character', () => {
      const start: LinkPosition = { line: 10, char: 5 };
      const end: LinkPosition = { line: 20, char: 10 };

      expect(formatLinkPosition(start, end)).toStrictEqual('10:5-20:10');
    });

    it('should format range with line only (no characters)', () => {
      const start: LinkPosition = { line: 10 };
      const end: LinkPosition = { line: 20 };

      expect(formatLinkPosition(start, end)).toStrictEqual('10-20');
    });

    it('should format range with start character but no end character', () => {
      const start: LinkPosition = { line: 10, char: 5 };
      const end: LinkPosition = { line: 20 };

      expect(formatLinkPosition(start, end)).toStrictEqual('10:5-20');
    });

    it('should format range with end character but no start character', () => {
      const start: LinkPosition = { line: 10 };
      const end: LinkPosition = { line: 20, char: 15 };

      expect(formatLinkPosition(start, end)).toStrictEqual('10-20:15');
    });
  });

  describe('Range on same line (different characters)', () => {
    it('should format same-line range with different start and end characters', () => {
      const start: LinkPosition = { line: 10, char: 5 };
      const end: LinkPosition = { line: 10, char: 15 };

      expect(formatLinkPosition(start, end)).toStrictEqual('10:5-10:15');
    });

    it('should format same-line range where start char is 0', () => {
      const start: LinkPosition = { line: 10, char: 0 };
      const end: LinkPosition = { line: 10, char: 25 };

      expect(formatLinkPosition(start, end)).toStrictEqual('10:0-10:25');
    });

    it('should format same-line range where end char is larger', () => {
      const start: LinkPosition = { line: 5, char: 10 };
      const end: LinkPosition = { line: 5, char: 100 };

      expect(formatLinkPosition(start, end)).toStrictEqual('5:10-5:100');
    });
  });

  describe('Edge cases', () => {
    it('should format large line numbers', () => {
      const start: LinkPosition = { line: 9999, char: 99 };
      const end: LinkPosition = { line: 10000, char: 1 };

      expect(formatLinkPosition(start, end)).toStrictEqual('9999:99-10000:1');
    });

    it('should handle line-only position at same line', () => {
      const start: LinkPosition = { line: 42 };
      const end: LinkPosition = { line: 42 };

      expect(formatLinkPosition(start, end)).toStrictEqual('42');
    });

    it('should handle character 0 (first column)', () => {
      const start: LinkPosition = { line: 10, char: 0 };
      const end: LinkPosition = { line: 10, char: 0 };

      expect(formatLinkPosition(start, end)).toStrictEqual('10:0');
    });
  });
});
