import { quoteLink } from '../../utils/quoteLink';

describe('quoteLink', () => {
  describe('safe paths (no-op)', () => {
    it('should return link unchanged for safe path', () => {
      expect(quoteLink('src/file.ts#L10', 'src/file.ts')).toBe('src/file.ts#L10');
    });
  });

  describe('unsafe paths (wraps entire link)', () => {
    it('should wrap entire link when path has spaces', () => {
      expect(quoteLink('My Folder/file.ts#L10', 'My Folder/file.ts')).toBe(
        "'My Folder/file.ts#L10'",
      );
    });

    it('should wrap entire link when path has hash', () => {
      expect(quoteLink('file#1.ts#L10', 'file#1.ts')).toBe("'file#1.ts#L10'");
    });

    it('should wrap entire link when path has parentheses', () => {
      expect(quoteLink('src/(group)/file.ts#L10', 'src/(group)/file.ts')).toBe(
        "'src/(group)/file.ts#L10'",
      );
    });
  });

  describe('embedded single quote escaping in link', () => {
    it('should escape embedded single quote in full link', () => {
      expect(quoteLink("it's_a_file.ts#L10", "it's_a_file.ts")).toBe("'it'\\''s_a_file.ts#L10'");
    });
  });
});
