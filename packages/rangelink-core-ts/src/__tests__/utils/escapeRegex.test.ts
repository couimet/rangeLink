import { escapeRegex } from '../../utils/escapeRegex';

describe('escapeRegex', () => {
  describe('Basic escaping', () => {
    it('should escape dot (.) character', () => {
      expect(escapeRegex('file.ts')).toStrictEqual('file\\.ts');
    });

    it('should escape asterisk (*) character', () => {
      expect(escapeRegex('a*b')).toStrictEqual('a\\*b');
    });

    it('should escape plus (+) character', () => {
      expect(escapeRegex('a+b')).toStrictEqual('a\\+b');
    });

    it('should escape question mark (?) character', () => {
      expect(escapeRegex('a?b')).toStrictEqual('a\\?b');
    });

    it('should escape caret (^) character', () => {
      expect(escapeRegex('^start')).toStrictEqual('\\^start');
    });

    it('should escape dollar ($) character', () => {
      expect(escapeRegex('end$')).toStrictEqual('end\\$');
    });

    it('should escape opening brace ({) character', () => {
      expect(escapeRegex('a{3}')).toStrictEqual('a\\{3\\}');
    });

    it('should escape closing brace (}) character', () => {
      expect(escapeRegex('a{3}')).toStrictEqual('a\\{3\\}');
    });

    it('should escape opening parenthesis (() character', () => {
      expect(escapeRegex('(group)')).toStrictEqual('\\(group\\)');
    });

    it('should escape closing parenthesis ()) character', () => {
      expect(escapeRegex('(group)')).toStrictEqual('\\(group\\)');
    });

    it('should escape pipe (|) character', () => {
      expect(escapeRegex('a|b')).toStrictEqual('a\\|b');
    });

    it('should escape opening bracket ([) character', () => {
      expect(escapeRegex('[class]')).toStrictEqual('\\[class\\]');
    });

    it('should escape closing bracket (]) character', () => {
      expect(escapeRegex('[class]')).toStrictEqual('\\[class\\]');
    });

    it('should escape backslash (\\) character', () => {
      expect(escapeRegex('a\\b')).toStrictEqual('a\\\\b');
    });
  });

  describe('Non-special characters', () => {
    it('should not escape hash (#)', () => {
      expect(escapeRegex('hash#')).toStrictEqual('hash#');
    });

    it('should not escape at (@)', () => {
      expect(escapeRegex('user@host')).toStrictEqual('user@host');
    });

    it('should not escape hyphen (-) when not in bracket', () => {
      expect(escapeRegex('L10-L20')).toStrictEqual('L10-L20');
    });

    it('should not escape colon (:)', () => {
      expect(escapeRegex('line10:line20')).toStrictEqual('line10:line20');
    });

    it('should not escape alphanumeric characters', () => {
      expect(escapeRegex('abc123')).toStrictEqual('abc123');
    });
  });

  describe('Multiple special characters', () => {
    it('should escape multiple different special characters', () => {
      expect(escapeRegex('a.b*c+d')).toStrictEqual('a\\.b\\*c\\+d');
    });

    it('should escape all special characters in complex pattern', () => {
      expect(escapeRegex('(a|b).{1,3}[cd]+')).toStrictEqual(
        '\\(a\\|b\\)\\.\\{1,3\\}\\[cd\\]\\+',
      );
    });

    it('should escape repeated special characters', () => {
      expect(escapeRegex('***')).toStrictEqual('\\*\\*\\*');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(escapeRegex('')).toStrictEqual('');
    });

    it('should handle string with only special characters', () => {
      expect(escapeRegex('.*+?')).toStrictEqual('\\.\\*\\+\\?');
    });

    it('should handle string with mixed content', () => {
      expect(escapeRegex('file.ts#L10-L20')).toStrictEqual('file\\.ts#L10-L20');
    });

    it('should handle delimiter-like strings', () => {
      expect(escapeRegex('>>')).toStrictEqual('>>');
      expect(escapeRegex('@@')).toStrictEqual('@@');
    });

    it('should handle regex-special delimiters', () => {
      expect(escapeRegex('.*')).toStrictEqual('\\.\\*');
      expect(escapeRegex('++')).toStrictEqual('\\+\\+');
      expect(escapeRegex('||')).toStrictEqual('\\|\\|');
    });
  });

  describe('Real-world usage', () => {
    it('should escape custom delimiter for regex pattern', () => {
      const delimiter = '.';
      const escaped = escapeRegex(delimiter);
      const pattern = new RegExp(`${escaped}\\d+`);

      expect('.10').toMatch(pattern);
      expect('a10').not.toMatch(pattern);
    });

    it('should handle multi-character delimiter with special chars', () => {
      const delimiter = '>>>';
      const escaped = escapeRegex(delimiter);

      expect(escaped).toStrictEqual('>>>');

      const pattern = new RegExp(`^${escaped}`);
      expect('>>>content').toMatch(pattern);
    });

    it('should escape delimiter for use in complex pattern', () => {
      const line = 'L';
      const position = '.';
      const range = '+';

      const escapedLine = escapeRegex(line);
      const escapedPosition = escapeRegex(position);
      const escapedRange = escapeRegex(range);

      const pattern = new RegExp(
        `^${escapedLine}(\\d+)${escapedPosition}(\\d+)${escapedRange}${escapedLine}(\\d+)$`,
      );

      expect('L10.5+L20').toMatch(pattern);
    });
  });
});
