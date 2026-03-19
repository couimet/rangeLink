import { isEligibleForPaste } from '../../utils';

describe('isEligibleForPaste', () => {
  describe('Null and undefined handling', () => {
    it('should return false for null', () => {
      expect(isEligibleForPaste(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isEligibleForPaste(undefined)).toBe(false);
    });
  });

  describe('Empty string handling', () => {
    it('should return false for empty string', () => {
      expect(isEligibleForPaste('')).toBe(false);
    });
  });

  describe('Whitespace-only strings (eligible for paste)', () => {
    it('should return true for single space', () => {
      expect(isEligibleForPaste(' ')).toBe(true);
    });

    it('should return true for multiple spaces', () => {
      expect(isEligibleForPaste('   ')).toBe(true);
    });

    it('should return true for tab character', () => {
      expect(isEligibleForPaste('\t')).toBe(true);
    });

    it('should return true for newline character', () => {
      expect(isEligibleForPaste('\n')).toBe(true);
    });

    it('should return true for mixed whitespace', () => {
      expect(isEligibleForPaste(' \t\n ')).toBe(true);
    });

    it('should return true for carriage return and newline', () => {
      expect(isEligibleForPaste('\r\n')).toBe(true);
    });
  });

  describe('Valid text (eligible for paste)', () => {
    it('should return true for simple text', () => {
      expect(isEligibleForPaste('link')).toBe(true);
    });

    it('should return true for text with leading space', () => {
      expect(isEligibleForPaste(' link')).toBe(true);
    });

    it('should return true for text with trailing space', () => {
      expect(isEligibleForPaste('link ')).toBe(true);
    });

    it('should return true for text with both leading and trailing spaces', () => {
      expect(isEligibleForPaste(' link ')).toBe(true);
    });

    it('should return true for multiline text', () => {
      expect(isEligibleForPaste('line1\nline2')).toBe(true);
    });

    it('should return true for text with internal whitespace', () => {
      expect(isEligibleForPaste('link with spaces')).toBe(true);
    });

    it('should return true for single character', () => {
      expect(isEligibleForPaste('a')).toBe(true);
    });

    it('should return true for RangeLink format', () => {
      expect(isEligibleForPaste('src/file.ts#L10-L20')).toBe(true);
    });

    it('should return true for text with special characters', () => {
      expect(isEligibleForPaste('file#123.ts##L10C5')).toBe(true);
    });

    it('should return true for unicode characters', () => {
      expect(isEligibleForPaste('文件.ts#L10')).toBe(true);
    });

    it('should return true for emoji', () => {
      expect(isEligibleForPaste('🚀file.ts#L10')).toBe(true);
    });
  });

  describe('Edge cases with whitespace boundaries', () => {
    it('should return true for text with only leading whitespace (has content)', () => {
      expect(isEligibleForPaste('  text')).toBe(true);
    });

    it('should return true for text with only trailing whitespace (has content)', () => {
      expect(isEligibleForPaste('text  ')).toBe(true);
    });

    it('should return true for text surrounded by much whitespace', () => {
      expect(isEligibleForPaste('     text     ')).toBe(true);
    });
  });
});
