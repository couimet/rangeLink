import { needsQuoting } from '../../utils/needsQuoting';

describe('needsQuoting', () => {
  describe('safe paths (returns false)', () => {
    it('should return false for simple filename', () => {
      expect(needsQuoting('file.ts')).toBe(false);
    });

    it('should return false for relative path with slashes', () => {
      expect(needsQuoting('src/components/file.ts')).toBe(false);
    });

    it('should return false for path with hyphens and underscores', () => {
      expect(needsQuoting('my-project/some_file.ts')).toBe(false);
    });

    it('should return false for path with colon', () => {
      expect(needsQuoting('C:/Users/name/file.ts')).toBe(false);
    });

    it('should return false for dotfiles', () => {
      expect(needsQuoting('.gitignore')).toBe(false);
    });

    it('should return false for deeply nested path', () => {
      expect(needsQuoting('a/b/c/d/e/f/g.ts')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(needsQuoting('')).toBe(false);
    });
  });

  describe('unsafe paths (returns true)', () => {
    it('should return true for path with spaces', () => {
      expect(needsQuoting('My Folder/file.ts')).toBe(true);
    });

    it('should return true for path with hash', () => {
      expect(needsQuoting('file#1.ts')).toBe(true);
    });

    it('should return true for path with at sign', () => {
      expect(needsQuoting('user@host.ts')).toBe(true);
    });

    it('should return true for path with backslash', () => {
      expect(needsQuoting('C:\\Users\\name\\file.ts')).toBe(true);
    });

    it('should return true for path with parentheses', () => {
      expect(needsQuoting('src/(group)/file.ts')).toBe(true);
    });

    it('should return true for path with ampersand', () => {
      expect(needsQuoting('A&B/file.ts')).toBe(true);
    });

    it('should return true for path with single quote', () => {
      expect(needsQuoting("it's_a_file.ts")).toBe(true);
    });

    it('should return true for path with double quote', () => {
      expect(needsQuoting('file"name".ts')).toBe(true);
    });

    it('should return true for path with Unicode characters', () => {
      expect(needsQuoting('路径/file.ts')).toBe(true);
    });

    it('should return true for path with shell metacharacters', () => {
      expect(needsQuoting('file;rm.ts')).toBe(true);
    });

    it('should return true for path with pipe', () => {
      expect(needsQuoting('a|b.ts')).toBe(true);
    });

    it('should return true for path with tilde', () => {
      expect(needsQuoting('~/file.ts')).toBe(true);
    });

    it('should return true for path with exclamation mark', () => {
      expect(needsQuoting('important!/file.ts')).toBe(true);
    });
  });
});
