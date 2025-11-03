import { DelimiterValidationError } from '../../types/DelimiterValidationError';
import { validateDelimiter } from '../../validation/validateDelimiter';

describe('validateDelimiter', () => {
  describe('basic validation', () => {
    it('should accept valid single-character delimiter', () => {
      const result = validateDelimiter('L');
      expect(result.success).toBe(true);
    });

    it('should accept valid multi-character delimiter', () => {
      const result = validateDelimiter('LINE');
      expect(result.success).toBe(true);
    });

    it('should reject empty string', () => {
      const result = validateDelimiter('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.Empty);
      }
    });

    it('should reject whitespace-only string', () => {
      const result = validateDelimiter('   ');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.Empty);
      }
    });
  });

  describe('digit validation', () => {
    it('should reject delimiter with digits', () => {
      const result = validateDelimiter('L1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsDigits);
      }
    });

    it('should reject delimiter starting with digit', () => {
      const result = validateDelimiter('1L');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsDigits);
      }
    });
  });

  describe('whitespace validation', () => {
    it('should reject delimiter with spaces', () => {
      const result = validateDelimiter('L ');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsWhitespace);
      }
    });

    it('should reject delimiter with tabs', () => {
      const result = validateDelimiter('L\t');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsWhitespace);
      }
    });
  });

  describe('reserved character validation', () => {
    it('should reject delimiter with tilde', () => {
      const result = validateDelimiter('~');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsReservedChar);
      }
    });

    it('should reject delimiter with pipe', () => {
      const result = validateDelimiter('|');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsReservedChar);
      }
    });

    it('should reject delimiter with forward slash', () => {
      const result = validateDelimiter('/');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsReservedChar);
      }
    });

    it('should reject delimiter with backslash', () => {
      const result = validateDelimiter('\\');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsReservedChar);
      }
    });

    it('should reject delimiter with colon', () => {
      const result = validateDelimiter(':');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsReservedChar);
      }
    });

    it('should reject delimiter with comma', () => {
      const result = validateDelimiter(',');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsReservedChar);
      }
    });

    it('should reject delimiter with at sign', () => {
      const result = validateDelimiter('@');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsReservedChar);
      }
    });
  });

  describe('hash delimiter validation', () => {
    it('should accept single-character hash delimiter', () => {
      const result = validateDelimiter('#', true);
      expect(result.success).toBe(true);
    });

    it('should reject multi-character hash delimiter', () => {
      const result = validateDelimiter('##', true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.HashNotSingleChar);
      }
    });

    it('should prioritize hash length check over reserved char for multi-char hash', () => {
      const result = validateDelimiter('~#', true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.HashNotSingleChar);
      }
    });

    it('should prioritize reserved char check for single-char reserved hash', () => {
      const result = validateDelimiter('~', true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(DelimiterValidationError.ContainsReservedChar);
      }
    });
  });
});
