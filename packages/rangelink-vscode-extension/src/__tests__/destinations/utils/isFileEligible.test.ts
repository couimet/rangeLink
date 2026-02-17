import { isFileEligible } from '../../../destinations/utils';

describe('isFileEligible', () => {
  describe('writable schemes', () => {
    it('returns true for file scheme with text file', () => {
      expect(isFileEligible('file', '/workspace/src/app.ts')).toBe(true);
    });

    it('returns true for untitled scheme', () => {
      expect(isFileEligible('untitled', 'Untitled-1')).toBe(true);
    });

    it('returns true for untitled even with binary-like path', () => {
      expect(isFileEligible('untitled', 'image.png')).toBe(true);
    });
  });

  describe('read-only schemes', () => {
    it('returns false for git scheme', () => {
      expect(isFileEligible('git', '/workspace/src/app.ts')).toBe(false);
    });

    it('returns false for output scheme', () => {
      expect(isFileEligible('output', 'output:RangeLink')).toBe(false);
    });

    it('returns false for vscode-settings scheme', () => {
      expect(isFileEligible('vscode-settings', 'settings.json')).toBe(false);
    });
  });

  describe('binary files', () => {
    it('returns false for png file', () => {
      expect(isFileEligible('file', '/workspace/assets/logo.png')).toBe(false);
    });

    it('returns false for pdf file', () => {
      expect(isFileEligible('file', '/workspace/docs/manual.pdf')).toBe(false);
    });

    it('returns false for zip file', () => {
      expect(isFileEligible('file', '/workspace/dist/bundle.zip')).toBe(false);
    });

    it('handles uppercase extensions', () => {
      expect(isFileEligible('file', '/workspace/LOGO.PNG')).toBe(false);
    });

    it('handles mixed case extensions', () => {
      expect(isFileEligible('file', '/workspace/Photo.JpEg')).toBe(false);
    });
  });

  describe('text files', () => {
    it('returns true for typescript file', () => {
      expect(isFileEligible('file', '/workspace/src/index.ts')).toBe(true);
    });

    it('returns true for json file', () => {
      expect(isFileEligible('file', '/workspace/package.json')).toBe(true);
    });

    it('returns true for markdown file', () => {
      expect(isFileEligible('file', '/workspace/README.md')).toBe(true);
    });

    it('returns true for extensionless file', () => {
      expect(isFileEligible('file', '/workspace/Makefile')).toBe(true);
    });
  });
});
