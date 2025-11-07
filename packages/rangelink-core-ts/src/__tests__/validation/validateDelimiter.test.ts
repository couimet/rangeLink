import { validateDelimiter } from '../../validation/validateDelimiter';

describe('validateDelimiter', () => {
  describe('basic validation', () => {
    it('should accept valid single-character delimiter', () => {
      const result = validateDelimiter('L');
      expect(result).toBeOk();
    });

    it('should accept valid multi-character delimiter', () => {
      const result = validateDelimiter('LINE');
      expect(result).toBeOk();
    });

    it('should reject empty string', () => {
      const result = validateDelimiter('');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_EMPTY', {
        message: 'Delimiter must not be empty',
        functionName: 'validateDelimiter',
        details: { value: '', isHash: false },
      });
    });

    it('should reject whitespace-only string', () => {
      const result = validateDelimiter('   ');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_EMPTY', {
        message: 'Delimiter must not be empty',
        functionName: 'validateDelimiter',
        details: { value: '   ', isHash: false },
      });
    });
  });

  describe('digit validation', () => {
    it('should reject delimiter with digits', () => {
      const result = validateDelimiter('L1');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_DIGITS', {
        message: 'Delimiter cannot contain digits',
        functionName: 'validateDelimiter',
        details: { value: 'L1', isHash: false },
      });
    });

    it('should reject delimiter starting with digit', () => {
      const result = validateDelimiter('1L');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_DIGITS', {
        message: 'Delimiter cannot contain digits',
        functionName: 'validateDelimiter',
        details: { value: '1L', isHash: false },
      });
    });
  });

  describe('whitespace validation', () => {
    it('should reject delimiter with spaces', () => {
      const result = validateDelimiter('L ');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_WHITESPACE', {
        message: 'Delimiter cannot contain whitespace',
        functionName: 'validateDelimiter',
        details: { value: 'L ', isHash: false },
      });
    });

    it('should reject delimiter with tabs', () => {
      const result = validateDelimiter('L\t');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_WHITESPACE', {
        message: 'Delimiter cannot contain whitespace',
        functionName: 'validateDelimiter',
        details: { value: 'L\t', isHash: false },
      });
    });
  });

  describe('reserved character validation', () => {
    it('should reject delimiter with tilde', () => {
      const result = validateDelimiter('~');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_RESERVED', {
        message: "Delimiter cannot contain reserved character '~'",
        functionName: 'validateDelimiter',
        details: { value: '~', isHash: false, reservedChar: '~' },
      });
    });

    it('should reject delimiter with pipe', () => {
      const result = validateDelimiter('|');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_RESERVED', {
        message: "Delimiter cannot contain reserved character '|'",
        functionName: 'validateDelimiter',
        details: { value: '|', isHash: false, reservedChar: '|' },
      });
    });

    it('should reject delimiter with forward slash', () => {
      const result = validateDelimiter('/');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_RESERVED', {
        message: "Delimiter cannot contain reserved character '/'",
        functionName: 'validateDelimiter',
        details: { value: '/', isHash: false, reservedChar: '/' },
      });
    });

    it('should reject delimiter with backslash', () => {
      const result = validateDelimiter('\\');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_RESERVED', {
        message: "Delimiter cannot contain reserved character '\\'",
        functionName: 'validateDelimiter',
        details: { value: '\\', isHash: false, reservedChar: '\\' },
      });
    });

    it('should reject delimiter with colon', () => {
      const result = validateDelimiter(':');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_RESERVED', {
        message: "Delimiter cannot contain reserved character ':'",
        functionName: 'validateDelimiter',
        details: { value: ':', isHash: false, reservedChar: ':' },
      });
    });

    it('should reject delimiter with comma', () => {
      const result = validateDelimiter(',');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_RESERVED', {
        message: "Delimiter cannot contain reserved character ','",
        functionName: 'validateDelimiter',
        details: { value: ',', isHash: false, reservedChar: ',' },
      });
    });

    it('should reject delimiter with at sign', () => {
      const result = validateDelimiter('@');
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_RESERVED', {
        message: "Delimiter cannot contain reserved character '@'",
        functionName: 'validateDelimiter',
        details: { value: '@', isHash: false, reservedChar: '@' },
      });
    });
  });

  describe('hash delimiter validation', () => {
    it('should accept single-character hash delimiter', () => {
      const result = validateDelimiter('#', true);
      expect(result).toBeOk();
    });

    it('should reject multi-character hash delimiter', () => {
      const result = validateDelimiter('##', true);
      expect(result).toBeRangeLinkErrorErr('CONFIG_HASH_NOT_SINGLE_CHAR', {
        message: 'Hash delimiter must be exactly one character',
        functionName: 'validateDelimiter',
        details: { value: '##', isHash: true, actualLength: 2 },
      });
    });

    it('should prioritize hash length check over reserved char for multi-char hash', () => {
      const result = validateDelimiter('~#', true);
      expect(result).toBeRangeLinkErrorErr('CONFIG_HASH_NOT_SINGLE_CHAR', {
        message: 'Hash delimiter must be exactly one character',
        functionName: 'validateDelimiter',
        details: { value: '~#', isHash: true, actualLength: 2 },
      });
    });

    it('should prioritize reserved char check for single-char reserved hash', () => {
      const result = validateDelimiter('~', true);
      expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_RESERVED', {
        message: "Delimiter cannot contain reserved character '~'",
        functionName: 'validateDelimiter',
        details: { value: '~', isHash: true, reservedChar: '~' },
      });
    });
  });
});
