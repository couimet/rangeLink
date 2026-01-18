import { isShellSafePath, quotePathForShell } from '../quotePathForShell';

describe('isShellSafePath', () => {
  describe('safe paths (should return true)', () => {
    it('should accept simple filename', () => {
      expect(isShellSafePath('file.ts')).toBe(true);
    });

    it('should accept path with forward slashes', () => {
      expect(isShellSafePath('/workspace/src/file.ts')).toBe(true);
    });

    it('should accept path with underscores', () => {
      expect(isShellSafePath('/workspace/my_file.ts')).toBe(true);
    });

    it('should accept path with hyphens', () => {
      expect(isShellSafePath('/workspace/my-file.ts')).toBe(true);
    });

    it('should accept path with numbers', () => {
      expect(isShellSafePath('/workspace/file123.ts')).toBe(true);
    });

    it('should accept Windows drive letter with colon', () => {
      expect(isShellSafePath('C:/Users/name/file.ts')).toBe(true);
    });

    it('should accept multiple dots', () => {
      expect(isShellSafePath('/workspace/file.test.ts')).toBe(true);
    });

    it('should accept uppercase letters', () => {
      expect(isShellSafePath('/Workspace/MyFile.TS')).toBe(true);
    });
  });

  describe('unsafe paths (should return false)', () => {
    it('should reject path with spaces', () => {
      expect(isShellSafePath('/workspace/my file.ts')).toBe(false);
    });

    it('should reject path with parentheses', () => {
      expect(isShellSafePath('/workspace/file(1).ts')).toBe(false);
    });

    it('should reject path with square brackets', () => {
      expect(isShellSafePath('/workspace/file[1].ts')).toBe(false);
    });

    it('should reject path with ampersand', () => {
      expect(isShellSafePath('/workspace/foo&bar.ts')).toBe(false);
    });

    it('should reject path with semicolon', () => {
      expect(isShellSafePath('/workspace/foo;bar.ts')).toBe(false);
    });

    it('should reject path with dollar sign', () => {
      expect(isShellSafePath('/workspace/$file.ts')).toBe(false);
    });

    it('should reject path with backtick', () => {
      expect(isShellSafePath('/workspace/`file`.ts')).toBe(false);
    });

    it('should reject path with single quote', () => {
      expect(isShellSafePath("/workspace/it's.ts")).toBe(false);
    });

    it('should reject path with double quote', () => {
      expect(isShellSafePath('/workspace/"file".ts')).toBe(false);
    });

    it('should reject path with backslash', () => {
      expect(isShellSafePath('C:\\Users\\name\\file.ts')).toBe(false);
    });

    it('should reject path with hash', () => {
      expect(isShellSafePath('/workspace/#file.ts')).toBe(false);
    });

    it('should reject path with exclamation mark', () => {
      expect(isShellSafePath('/workspace/file!.ts')).toBe(false);
    });

    it('should reject path with asterisk', () => {
      expect(isShellSafePath('/workspace/*.ts')).toBe(false);
    });

    it('should reject path with question mark', () => {
      expect(isShellSafePath('/workspace/file?.ts')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isShellSafePath('')).toBe(false);
    });
  });
});

describe('quotePathForShell', () => {
  describe('safe paths (should return unchanged)', () => {
    it('should not quote simple path', () => {
      expect(quotePathForShell('/workspace/src/file.ts')).toBe('/workspace/src/file.ts');
    });

    it('should not quote path with underscores and hyphens', () => {
      expect(quotePathForShell('/my_workspace/my-file.ts')).toBe('/my_workspace/my-file.ts');
    });

    it('should not quote Windows path with drive letter', () => {
      expect(quotePathForShell('C:/Users/name/file.ts')).toBe('C:/Users/name/file.ts');
    });
  });

  describe('unsafe paths (should return quoted)', () => {
    it('should quote path with spaces', () => {
      expect(quotePathForShell('/workspace/my file.ts')).toBe('"/workspace/my file.ts"');
    });

    it('should quote path with parentheses', () => {
      expect(quotePathForShell('/workspace/file(1).ts')).toBe('"/workspace/file(1).ts"');
    });

    it('should quote path with multiple special characters', () => {
      expect(quotePathForShell('/my workspace/file (copy).ts')).toBe('"/my workspace/file (copy).ts"');
    });

    it('should quote path with ampersand', () => {
      expect(quotePathForShell('/workspace/foo&bar.ts')).toBe('"/workspace/foo&bar.ts"');
    });

    it('should quote path with semicolon', () => {
      expect(quotePathForShell('/workspace/foo;bar.ts')).toBe('"/workspace/foo;bar.ts"');
    });
  });

  describe('paths containing double quotes (should escape and quote)', () => {
    it('should escape single double quote', () => {
      expect(quotePathForShell('/workspace/"file".ts')).toBe('"/workspace/\\"file\\".ts"');
    });

    it('should escape multiple double quotes', () => {
      expect(quotePathForShell('/workspace/"my" "file".ts')).toBe('"/workspace/\\"my\\" \\"file\\".ts"');
    });

    it('should escape double quote in path with other special chars', () => {
      expect(quotePathForShell('/workspace/file "name" (1).ts')).toBe('"/workspace/file \\"name\\" (1).ts"');
    });
  });

  describe('edge cases', () => {
    it('should handle path that is just a space', () => {
      expect(quotePathForShell(' ')).toBe('" "');
    });

    it('should handle path with leading space', () => {
      expect(quotePathForShell(' file.ts')).toBe('" file.ts"');
    });

    it('should handle path with trailing space', () => {
      expect(quotePathForShell('file.ts ')).toBe('"file.ts "');
    });

    it('should handle path with only special characters', () => {
      expect(quotePathForShell('()[]')).toBe('"()[]"');
    });
  });
});
