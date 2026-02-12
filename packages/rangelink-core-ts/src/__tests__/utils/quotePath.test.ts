import { quotePath } from '../../utils/quotePath';

describe('quotePath', () => {
  describe('safe paths (no-op)', () => {
    it('should return safe path unchanged', () => {
      expect(quotePath('src/file.ts')).toBe('src/file.ts');
    });

    it('should return path with colons unchanged', () => {
      expect(quotePath('C:/Users/name/file.ts')).toBe('C:/Users/name/file.ts');
    });

    it('should return empty string unchanged', () => {
      expect(quotePath('')).toBe('');
    });
  });

  describe('unsafe paths (wraps in single quotes)', () => {
    it('should wrap path with spaces', () => {
      expect(quotePath('My Folder/file.ts')).toBe("'My Folder/file.ts'");
    });

    it('should wrap path with hash', () => {
      expect(quotePath('file#1.ts')).toBe("'file#1.ts'");
    });

    it('should wrap path with parentheses', () => {
      expect(quotePath('src/(group)/file.ts')).toBe("'src/(group)/file.ts'");
    });

    it('should wrap path with backslash', () => {
      expect(quotePath('C:\\Users\\name\\file.ts')).toBe("'C:\\Users\\name\\file.ts'");
    });
  });

  describe('embedded single quote escaping', () => {
    it('should escape embedded single quote using POSIX sequence', () => {
      expect(quotePath("it's_a_file.ts")).toBe("'it'\\''s_a_file.ts'");
    });

    it('should escape multiple embedded single quotes', () => {
      expect(quotePath("a'b'c.ts")).toBe("'a'\\''b'\\''c.ts'");
    });
  });
});
