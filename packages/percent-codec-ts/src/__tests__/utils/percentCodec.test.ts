import { decodePercentUTF8, encodePercentUTF8 } from '../../utils/percentCodec';

describe('encodePercentUTF8', () => {
  describe('encodeURIComponent raw set stays unescaped', () => {
    it('should leave every raw-set ASCII character untouched', () => {
      // Exercises each allowed class: A-Z, a-z, 0-9, and each safe punctuation char.
      expect(encodePercentUTF8("ABCdef9012345-_.!~*'()")).toBe("ABCdef9012345-_.!~*'()");
    });
  });

  describe('percent-escaped output', () => {
    it('should escape ASCII characters outside the raw set', () => {
      expect(encodePercentUTF8(' ')).toBe('%20');
      expect(encodePercentUTF8('%')).toBe('%25');
      expect(encodePercentUTF8('\n')).toBe('%0A');
      expect(encodePercentUTF8('#')).toBe('%23');
      expect(encodePercentUTF8(':')).toBe('%3A');
      expect(encodePercentUTF8('/')).toBe('%2F');
      expect(encodePercentUTF8('+')).toBe('%2B');
    });

    it('should UTF-8 encode a 2-byte character', () => {
      expect(encodePercentUTF8('é')).toBe('%C3%A9');
    });

    it('should UTF-8 encode a 3-byte character', () => {
      expect(encodePercentUTF8('中')).toBe('%E4%B8%AD');
    });

    it('should UTF-8 encode a 4-byte character', () => {
      expect(encodePercentUTF8('😀')).toBe('%F0%9F%98%80');
    });

    it('should escape uppercase hex', () => {
      expect(encodePercentUTF8('a b')).toBe('a%20b');
    });
  });
});

describe('decodePercentUTF8', () => {
  describe('valid input', () => {
    it('should decode plain text with no escapes', () => {
      const result = decodePercentUTF8('Hello raw');

      expect(result).toBeSuccess('Hello raw');
    });

    it('should decode raw-set ASCII text that encoders leave unescaped', () => {
      const result = decodePercentUTF8("a-_.!~*'()b");

      expect(result).toBeSuccess("a-_.!~*'()b");
    });

    it('should decode percent-escaped ASCII', () => {
      const result = decodePercentUTF8('%48%69%20there');

      expect(result).toBeSuccess('Hi there');
    });

    it('should decode mixed raw and escaped ASCII', () => {
      const result = decodePercentUTF8('a%20b');

      expect(result).toBeSuccess('a b');
    });

    it('should decode a 2-byte character', () => {
      const result = decodePercentUTF8('%C3%A9');

      expect(result).toBeSuccess('é');
    });

    it('should decode a 3-byte character', () => {
      const result = decodePercentUTF8('%E4%B8%AD');

      expect(result).toBeSuccess('中');
    });

    it('should decode a 4-byte character', () => {
      const result = decodePercentUTF8('%F0%9F%98%80');

      expect(result).toBeSuccess('😀');
    });

    it('should decode the largest valid 4-byte code point', () => {
      const result = decodePercentUTF8('%F4%8F%BF%BF');

      expect(result).toBeSuccess('\u{10FFFF}');
    });

    it('should accept lowercase hex digits', () => {
      const result = decodePercentUTF8('%c3%a9');

      expect(result).toBeSuccess('é');
    });

    it('should accept raw non-ASCII characters as their own UTF-8 bytes', () => {
      const result = decodePercentUTF8('café');

      expect(result).toBeSuccess('café');
    });
  });

  describe('PERCENT_DECODE_MALFORMED', () => {
    it('should reject a bare percent at end of input', () => {
      const result = decodePercentUTF8('abc%');

      expect(result).toHaveDetailedError('PERCENT_DECODE_MALFORMED', {
        message: "Malformed percent-encoding at index 3: '%' must be followed by two hex digits",
        functionName: 'decodePercentUTF8',
        details: { index: 3 },
      });
    });

    it('should reject an escape with only one hex digit', () => {
      const result = decodePercentUTF8('%A');

      expect(result).toHaveDetailedError('PERCENT_DECODE_MALFORMED', {
        message: "Malformed percent-encoding at index 0: '%' must be followed by two hex digits",
        functionName: 'decodePercentUTF8',
        details: { index: 0 },
      });
    });

    it('should reject a non-hex high digit', () => {
      const result = decodePercentUTF8('%G0');

      expect(result).toHaveDetailedError('PERCENT_DECODE_MALFORMED', {
        message: "Malformed percent-encoding at index 0: '%' must be followed by two hex digits",
        functionName: 'decodePercentUTF8',
        details: { index: 0 },
      });
    });

    it('should reject a non-hex low digit', () => {
      const result = decodePercentUTF8('%0G');

      expect(result).toHaveDetailedError('PERCENT_DECODE_MALFORMED', {
        message: "Malformed percent-encoding at index 0: '%' must be followed by two hex digits",
        functionName: 'decodePercentUTF8',
        details: { index: 0 },
      });
    });
  });

  describe('PERCENT_DECODE_INVALID_UTF8', () => {
    it('should reject a 2-byte overlong encoding', () => {
      const result = decodePercentUTF8('%C0%AF');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject a truncated 2-byte sequence', () => {
      const result = decodePercentUTF8('%C3');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject a 2-byte sequence with a non-continuation byte', () => {
      const result = decodePercentUTF8('%C3%28');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 1 },
      });
    });

    it('should reject a truncated 3-byte sequence', () => {
      const result = decodePercentUTF8('%E4%B8');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject a 3-byte overlong encoding', () => {
      const result = decodePercentUTF8('%E0%80%AF');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject a 3-byte sequence encoding a UTF-16 surrogate', () => {
      const result = decodePercentUTF8('%ED%A0%80');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject a 4-byte sequence below U+10000', () => {
      const result = decodePercentUTF8('%F0%80%80%80');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject a 4-byte sequence above U+10FFFF', () => {
      const result = decodePercentUTF8('%F4%90%80%80');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject an invalid leading byte', () => {
      const result = decodePercentUTF8('%FF');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject a lone continuation byte', () => {
      const result = decodePercentUTF8('%80');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 0 },
      });
    });

    it('should reject a bad continuation deep in a longer string', () => {
      const result = decodePercentUTF8('a%C4%28b');

      expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex: 2 },
      });
    });
  });
});

describe('round-trip', () => {
  it('should preserve text through encode then decode', () => {
    const samples = ['plain', 'spaces here', "it's (quoted)!~*", 'two\nlines', 'é ü 中 😀', '%#:\\/?&+='];

    for (const sample of samples) {
      const result = decodePercentUTF8(encodePercentUTF8(sample));
      expect(result).toBeSuccess(sample);
    }
  });
});
