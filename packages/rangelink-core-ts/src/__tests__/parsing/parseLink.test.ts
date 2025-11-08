import { getLogger } from 'barebone-logger';

import { MAX_LINK_LENGTH } from '../../constants/MAX_LINK_LENGTH';
import { RangeLinkError } from '../../errors/RangeLinkError';
import { parseLink } from '../../parsing/parseLink';
import { ParsedLink } from '../../types/ParsedLink';

describe('parseLink', () => {
  describe('Basic formats (default delimiters)', () => {
    describe('Single line', () => {
      it('should parse single line without column', () => {
        const result = parseLink('src/file.ts#L10');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'src/file.ts',
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse single line with column', () => {
        const result = parseLink('src/auth.ts#L42C10');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'src/auth.ts',
            start: { line: 42, char: 10 },
            end: { line: 42, char: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse line 1', () => {
        const result = parseLink('file.ts#L1');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 1 },
            end: { line: 1 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse very large line numbers', () => {
        const result = parseLink('file.ts#L999999');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 999999 },
            end: { line: 999999 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });
    });

    describe('Multi-line ranges', () => {
      it('should parse line-only range', () => {
        const result = parseLink('file.ts#L10-L20');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10 },
            end: { line: 20 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse range with start column only', () => {
        const result = parseLink('file.ts#L10C5-L20');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10, char: 5 },
            end: { line: 20 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse range with end column only', () => {
        const result = parseLink('file.ts#L10-L20C15');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10 },
            end: { line: 20, char: 15 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse full range with columns', () => {
        const result = parseLink('src/auth.ts#L42C10-L58C25');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'src/auth.ts',
            start: { line: 42, char: 10 },
            end: { line: 58, char: 25 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });
    });

    describe('Rectangular mode (double hash)', () => {
      it('should parse rectangular single line', () => {
        const result = parseLink('file.ts##L10C5');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10, char: 5 },
            end: { line: 10, char: 5 },
            linkType: 'regular',
            selectionType: 'Rectangular',
          });
        });
      });

      it('should parse rectangular range', () => {
        const result = parseLink('file.ts##L10C5-L20C10');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10, char: 5 },
            end: { line: 20, char: 10 },
            linkType: 'regular',
            selectionType: 'Rectangular',
          });
        });
      });
    });
  });

  describe('Hash-in-filename support (bug fix)', () => {
    it('should parse filename with single hash correctly', () => {
      const result = parseLink('file#1.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file#1.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('should parse filename with multiple hashes', () => {
      const result = parseLink('issue#123#fix.ts#L42C5');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'issue#123#fix.ts',
          start: { line: 42, char: 5 },
          end: { line: 42, char: 5 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('should parse path with hash in directory name', () => {
      const result = parseLink('issue#123/auth.ts#L42');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'issue#123/auth.ts',
          start: { line: 42 },
          end: { line: 42 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('should parse filename with hash and range', () => {
      const result = parseLink('file#1.ts#L10-L20');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file#1.ts',
          start: { line: 10 },
          end: { line: 20 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('should parse filename with hash in rectangular mode', () => {
      const result = parseLink('file#1.ts##L10C5-L20C10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file#1.ts',
          start: { line: 10, char: 5 },
          end: { line: 20, char: 10 },
          linkType: 'regular',
          selectionType: 'Rectangular',
        });
      });
    });

    it('should parse absolute path with hash', () => {
      const result = parseLink('/home/user/project#1/src/file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: '/home/user/project#1/src/file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });
  });

  describe('Custom delimiters', () => {
    describe('Single-character custom delimiters', () => {
      it('should parse with @ hash delimiter', () => {
        const customDelimiters = {
          hash: '@',
          line: 'L',
          position: 'C',
          range: '-',
        };

        const result = parseLink('file.ts@L10C5', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10, char: 5 },
            end: { line: 10, char: 5 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse with ! hash and : range', () => {
        const customDelimiters = {
          hash: '!',
          line: 'L',
          position: 'C',
          range: ':',
        };

        const result = parseLink('file.ts!L10:L20', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10 },
            end: { line: 20 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse rectangular mode with @ delimiter', () => {
        const customDelimiters = {
          hash: '@',
          line: 'L',
          position: 'C',
          range: '-',
        };

        const result = parseLink('file.ts@@L10C5', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10, char: 5 },
            end: { line: 10, char: 5 },
            linkType: 'regular',
            selectionType: 'Rectangular',
          });
        });
      });
    });

    describe('Multi-character custom delimiters', () => {
      it('should parse with multi-char hash delimiter', () => {
        const customDelimiters = {
          hash: '>>',
          line: 'line',
          position: 'pos',
          range: 'thru',
        };

        const result = parseLink('file.ts>>line10pos5', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10, char: 5 },
            end: { line: 10, char: 5 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse range with multi-char delimiters', () => {
        const customDelimiters = {
          hash: '>>',
          line: 'line',
          position: 'pos',
          range: ':',
        };

        const result = parseLink('file.ts>>line10pos5:line20pos10', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10, char: 5 },
            end: { line: 20, char: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should parse rectangular mode with multi-char hash', () => {
        const customDelimiters = {
          hash: '>>',
          line: 'line',
          position: 'pos',
          range: ':',
        };

        const result = parseLink('file.ts>>>>line10pos5', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10, char: 5 },
            end: { line: 10, char: 5 },
            linkType: 'regular',
            selectionType: 'Rectangular',
          });
        });
      });
    });

    describe('Regex-special character delimiters', () => {
      it('should handle dot (.) delimiter', () => {
        const customDelimiters = {
          hash: '.',
          line: 'L',
          position: 'C',
          range: '-',
        };

        const result = parseLink('file.txt.L10', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.txt',
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should handle plus (+) delimiter', () => {
        const customDelimiters = {
          hash: '+',
          line: 'L',
          position: 'C',
          range: '-',
        };

        const result = parseLink('file.ts+L10', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });

      it('should handle pipe (|) delimiter', () => {
        const customDelimiters = {
          hash: '|',
          line: 'L',
          position: 'C',
          range: '-',
        };

        const result = parseLink('file.ts|L10', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'file.ts',
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });
    });

    describe('Hash-in-filename with custom delimiters', () => {
      it('should parse filename with @ in path using @ delimiter', () => {
        const customDelimiters = {
          hash: '@',
          line: 'L',
          position: 'C',
          range: '-',
        };

        const result = parseLink('user@host.ts@L10', customDelimiters);

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value).toStrictEqual({
            path: 'user@host.ts',
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          });
        });
      });
    });
  });

  describe('Error cases', () => {
    describe('PARSE_LINK_TOO_LONG', () => {
      it('should reject link exceeding maximum length', () => {
        const longPath = 'a'.repeat(MAX_LINK_LENGTH + 1);
        const result = parseLink(longPath);

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_LINK_TOO_LONG', {
            message: `Link exceeds maximum length of ${MAX_LINK_LENGTH} characters`,
            functionName: 'parseLink',
            details: { received: longPath.length, maximum: MAX_LINK_LENGTH },
          });
        });
      });

      it('should accept link at maximum length', () => {
        const maxPath = 'a'.repeat(MAX_LINK_LENGTH - 4) + '#L10';
        const result = parseLink(maxPath);

        expect(result.success).toBe(true);
      });
    });

    describe('PARSE_EMPTY_LINK', () => {
      it('should reject empty string', () => {
        const result = parseLink('');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_EMPTY_LINK', {
            message: 'Link cannot be empty',
            functionName: 'parseLink',
          });
        });
      });

      it('should reject whitespace-only string', () => {
        const result = parseLink('   ');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_EMPTY_LINK', {
            message: 'Link cannot be empty',
            functionName: 'parseLink',
          });
        });
      });
    });

    describe('PARSE_EMPTY_PATH', () => {
      it('should reject link starting with hash', () => {
        const result = parseLink('#L10');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_EMPTY_PATH', {
            message: 'Path cannot be empty',
            functionName: 'parseLink',
          });
        });
      });

      it('should reject link starting with double hash', () => {
        const result = parseLink('##L10C5');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_EMPTY_PATH', {
            message: 'Path cannot be empty',
            functionName: 'parseLink',
          });
        });
      });

      it('should reject empty path with custom delimiter', () => {
        const customDelimiters = {
          hash: '@',
          line: 'L',
          position: 'C',
          range: '-',
        };

        const result = parseLink('@L10', customDelimiters);

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_EMPTY_PATH', {
            message: 'Path cannot be empty',
            functionName: 'parseLink',
          });
        });
      });
    });

    describe('PARSE_NO_HASH_SEPARATOR', () => {
      it('should reject link without hash separator', () => {
        const result = parseLink('file.ts');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_NO_HASH_SEPARATOR', {
            message: 'Link must contain # separator',
            functionName: 'parseLink',
            details: { hash: '#' },
          });
        });
      });

      it('should reject link missing custom hash separator', () => {
        const customDelimiters = {
          hash: '@',
          line: 'L',
          position: 'C',
          range: '-',
        };

        const result = parseLink('file.ts#L10', customDelimiters);

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_NO_HASH_SEPARATOR', {
            message: 'Link must contain @ separator',
            functionName: 'parseLink',
            details: { hash: '@' },
          });
        });
      });
    });

    describe('PARSE_INVALID_RANGE_FORMAT', () => {
      it('should reject hash without line number', () => {
        const result = parseLink('file.ts#');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_INVALID_RANGE_FORMAT', {
            message: 'Invalid range format',
            functionName: 'parseLink',
          });
        });
      });

      it('should reject line without number', () => {
        const result = parseLink('file.ts#L');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_INVALID_RANGE_FORMAT', {
            message: 'Invalid range format',
            functionName: 'parseLink',
          });
        });
      });

      it('should reject invalid range delimiter', () => {
        const result = parseLink('file.ts#L10_L20');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_INVALID_RANGE_FORMAT', {
            message: 'Invalid range format',
            functionName: 'parseLink',
          });
        });
      });

      it('should reject column without number', () => {
        const result = parseLink('file.ts#L10C');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_INVALID_RANGE_FORMAT', {
            message: 'Invalid range format',
            functionName: 'parseLink',
          });
        });
      });

      it('should reject malformed range', () => {
        const result = parseLink('file.ts#L10-L20C');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_INVALID_RANGE_FORMAT', {
            message: 'Invalid range format',
            functionName: 'parseLink',
          });
        });
      });
    });

    describe('PARSE_LINE_BELOW_MINIMUM', () => {
      it('should reject line 0', () => {
        const result = parseLink('file.ts#L0');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_LINE_BELOW_MINIMUM', {
            message: 'Start line must be >= 1',
            functionName: 'parseLink',
            details: { received: 0, minimum: 1, position: 'start' },
          });
        });
      });

      it('should reject negative line number', () => {
        // Note: Regex won't match negative numbers, so this becomes INVALID_RANGE_FORMAT
        const result = parseLink('file.ts#L-5');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_INVALID_RANGE_FORMAT', {
            message: 'Invalid range format',
            functionName: 'parseLink',
          });
        });
      });
    });

    describe('PARSE_LINE_BACKWARD', () => {
      it('should reject end line before start line', () => {
        const result = parseLink('file.ts#L20-L10');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_LINE_BACKWARD', {
            message: 'End line cannot be before start line',
            functionName: 'parseLink',
            details: { startLine: 20, endLine: 10 },
          });
        });
      });
    });

    describe('PARSE_CHAR_BELOW_MINIMUM', () => {
      it('should reject start char 0', () => {
        const result = parseLink('file.ts#L10C0');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_CHAR_BELOW_MINIMUM', {
            message: 'Start character must be >= 1',
            functionName: 'parseLink',
            details: { received: 0, minimum: 1, position: 'start' },
          });
        });
      });

      it('should reject end char 0', () => {
        const result = parseLink('file.ts#L10-L20C0');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_CHAR_BELOW_MINIMUM', {
            message: 'End character must be >= 1',
            functionName: 'parseLink',
            details: { received: 0, minimum: 1, position: 'end' },
          });
        });
      });
    });

    describe('PARSE_CHAR_BACKWARD_SAME_LINE', () => {
      it('should reject end char before start char on same line', () => {
        const result = parseLink('file.ts#L10C20-L10C5');

        expect(result).toBeErrWith((error: RangeLinkError) => {
          expect(error).toBeRangeLinkError('PARSE_CHAR_BACKWARD_SAME_LINE', {
            message: 'End character cannot be before start character on same line',
            functionName: 'parseLink',
            details: { startChar: 20, endChar: 5, line: 10 },
          });
        });
      });

      it('should allow end char before start char on different lines', () => {
        const result = parseLink('file.ts#L10C20-L11C5');

        expect(result).toBeOkWith((value: ParsedLink) => {
          expect(value.start).toStrictEqual({ line: 10, char: 20 });
          expect(value.end).toStrictEqual({ line: 11, char: 5 });
        });
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle very long path', () => {
      const longPath = 'a/'.repeat(500) + 'file.ts';
      const result = parseLink(`${longPath}#L10`);

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual(longPath);
        expect(value.start.line).toStrictEqual(10);
      });
    });

    it('should handle path with special characters', () => {
      const result = parseLink('path/with spaces/file-name_2.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('path/with spaces/file-name_2.ts');
      });
    });

    it('should handle path with dots', () => {
      const result = parseLink('../../relative/path/file.spec.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('../../relative/path/file.spec.ts');
      });
    });

    it('should handle Windows-style path', () => {
      const result = parseLink('C:\\Users\\name\\file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('C:\\Users\\name\\file.ts');
      });
    });

    it('should handle path with Unicode characters', () => {
      const result = parseLink('路径/файл/αρχείο.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('路径/файл/αρχείο.ts');
      });
    });

    it('should handle identical start and end line', () => {
      const result = parseLink('file.ts#L10-L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.start.line).toStrictEqual(10);
        expect(value.end.line).toStrictEqual(10);
      });
    });

    it('should handle identical start and end char on same line', () => {
      const result = parseLink('file.ts#L10C5-L10C5');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.start).toStrictEqual({ line: 10, char: 5 });
        expect(value.end).toStrictEqual({ line: 10, char: 5 });
      });
    });
  });

  describe('Logger verification', () => {
    let loggerDebugSpy: jest.SpyInstance;

    beforeEach(() => {
      const logger = getLogger();
      loggerDebugSpy = jest.spyOn(logger, 'debug');
    });

    afterEach(() => {
      loggerDebugSpy.mockRestore();
    });

    it('should log when using default delimiters (no param provided)', () => {
      parseLink('file.ts#L10');

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'parseLink',
          link: 'file.ts#L10',
          delimiters: {
            hash: '#',
            line: 'L',
            position: 'C',
            range: '-',
          },
        }),
        'No delimiter config provided, using DEFAULT_DELIMITERS',
      );
    });

    it('should log when using provided custom delimiters', () => {
      const customDelimiters = {
        hash: '@',
        line: 'line',
        position: 'pos',
        range: ':',
      };

      parseLink('file.ts@line10', customDelimiters);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'parseLink',
          link: 'file.ts@line10',
          delimiters: customDelimiters,
        }),
        'Using provided delimiter config',
      );
    });

    it('should log when using explicitly provided default delimiters', () => {
      const explicitDefaults = {
        hash: '#',
        line: 'L',
        position: 'C',
        range: '-',
      };

      parseLink('file.ts#L10', explicitDefaults);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'parseLink',
          link: 'file.ts#L10',
          delimiters: explicitDefaults,
        }),
        'Using provided delimiter config',
      );
    });

    it('should log even when parsing fails', () => {
      const customDelimiters = {
        hash: '@',
        line: 'L',
        position: 'C',
        range: '-',
      };

      // This will fail because link uses # but config expects @
      parseLink('file.ts#L10', customDelimiters);

      // Logger should still be called before the error
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'parseLink',
          link: 'file.ts#L10',
          delimiters: customDelimiters,
        }),
        'Using provided delimiter config',
      );
    });

    it('should log exactly once per parseLink call', () => {
      parseLink('file.ts#L10');

      // Should be called exactly once
      expect(loggerDebugSpy).toHaveBeenCalledTimes(1);
    });
  });
});
