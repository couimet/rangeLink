import { parseLink } from '../../parsing/parseLink';
import { ParsedLink } from '../../types/ParsedLink';

describe('parseLink', () => {
  describe('single line format (#L10)', () => {
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

  describe('multi-line format (#L10-L20)', () => {
    it('should parse multi-line without columns', () => {
      const result = parseLink('src/file.ts#L10-L20');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'src/file.ts',
          start: { line: 10 },
          end: { line: 20 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('should parse multi-line with columns', () => {
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

    it('should parse multi-line with only start column', () => {
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

    it('should parse multi-line with only end column', () => {
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

    it('should parse adjacent lines', () => {
      const result = parseLink('file.ts#L10-L11');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file.ts',
          start: { line: 10 },
          end: { line: 11 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('should parse large line ranges', () => {
      const result = parseLink('file.ts#L1-L999999');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file.ts',
          start: { line: 1 },
          end: { line: 999999 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });
  });

  describe('rectangular mode format (##L10C5-L20C10)', () => {
    it('should parse rectangular selection', () => {
      const result = parseLink('src/file.ts##L10C5-L20C10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'src/file.ts',
          start: { line: 10, char: 5 },
          end: { line: 20, char: 10 },
          linkType: 'regular',
          selectionType: 'Rectangular',
        });
      });
    });

    it('should parse rectangular with single line', () => {
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

    it('should distinguish ## from # in selection type', () => {
      const regular = parseLink('file.ts#L10C5-L20C10');
      const rectangular = parseLink('file.ts##L10C5-L20C10');

      expect(regular).toBeOkWith((value: ParsedLink) => {
        expect(value.selectionType).toStrictEqual('Normal');
      });

      expect(rectangular).toBeOkWith((value: ParsedLink) => {
        expect(value.selectionType).toStrictEqual('Rectangular');
      });
    });
  });

  describe('path handling', () => {
    it('should parse relative paths', () => {
      const result = parseLink('./src/file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('./src/file.ts');
      });
    });

    it('should parse absolute paths', () => {
      const result = parseLink('/Users/name/project/file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('/Users/name/project/file.ts');
      });
    });

    it('should parse Windows-style paths', () => {
      const result = parseLink('C:\\Users\\name\\project\\file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('C:\\Users\\name\\project\\file.ts');
      });
    });

    it('should parse paths with spaces', () => {
      const result = parseLink('path with spaces/file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('path with spaces/file.ts');
      });
    });

    it('should parse paths with special characters', () => {
      const result = parseLink('path-with_special.chars/file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('path-with_special.chars/file.ts');
      });
    });

    it('should parse simple filenames', () => {
      const result = parseLink('file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toStrictEqual('file.ts');
      });
    });
  });

  describe('error cases', () => {
    it('should reject empty string', () => {
      const result = parseLink('');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('Link cannot be empty');
      });
    });

    it('should reject whitespace-only string', () => {
      const result = parseLink('   ');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('Link cannot be empty');
      });
    });

    it('should reject link without hash', () => {
      const result = parseLink('src/file.ts');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('Link must contain # separator');
      });
    });

    it('should reject empty path', () => {
      const result = parseLink('#L10');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('Path cannot be empty');
      });
    });

    it('should reject invalid range format', () => {
      const result = parseLink('file.ts#invalid');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toContain('Invalid range format');
      });
    });

    it('should reject line 0', () => {
      const result = parseLink('file.ts#L0');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('Start line must be >= 1');
      });
    });

    it('should reject negative line numbers', () => {
      const result = parseLink('file.ts#L-5');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toContain('Invalid range format');
      });
    });

    it('should reject end line before start line', () => {
      const result = parseLink('file.ts#L20-L10');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('End line cannot be before start line');
      });
    });

    it('should reject character 0', () => {
      const result = parseLink('file.ts#L10C0');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('Start character must be >= 1');
      });
    });

    it('should reject end character 0', () => {
      const result = parseLink('file.ts#L10C5-L20C0');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('End character must be >= 1');
      });
    });

    it('should reject end character before start character on same line', () => {
      const result = parseLink('file.ts#L10C20-L10C5');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toStrictEqual('End character cannot be before start character on same line');
      });
    });

    it('should reject malformed range with missing L', () => {
      const result = parseLink('file.ts#10');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toContain('Invalid range format');
      });
    });

    it('should reject malformed range with invalid format', () => {
      const result = parseLink('file.ts#L10C');

      expect(result).toBeErrWith((error: string) => {
        expect(error).toContain('Invalid range format');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle same line range (L10-L10)', () => {
      const result = parseLink('file.ts#L10-L10');

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

    it('should handle same position range with columns', () => {
      const result = parseLink('file.ts#L10C5-L10C5');

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

    it('should allow end char before start char on different lines', () => {
      const result = parseLink('file.ts#L10C20-L20C5');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file.ts',
          start: { line: 10, char: 20 },
          end: { line: 20, char: 5 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('should handle very large column numbers', () => {
      const result = parseLink('file.ts#L10C999999');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.start.char).toStrictEqual(999999);
      });
    });
  });
});
