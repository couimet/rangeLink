import { isBinaryFile } from '..';

describe('isBinaryFile', () => {
  describe('untitled scheme', () => {
    it('returns false for untitled files (always text-like regardless of name)', () => {
      expect(isBinaryFile('untitled', 'Untitled-1')).toBe(false);
    });

    it('returns false for untitled files even with binary-like name', () => {
      expect(isBinaryFile('untitled', 'image.png')).toBe(false);
    });
  });

  describe('text-like files', () => {
    it('returns false for .ts files', () => {
      expect(isBinaryFile('file', '/project/src/index.ts')).toBe(false);
    });

    it('returns false for .js files', () => {
      expect(isBinaryFile('file', '/project/src/utils.js')).toBe(false);
    });

    it('returns false for .md files', () => {
      expect(isBinaryFile('file', '/project/README.md')).toBe(false);
    });

    it('returns false for extensionless files', () => {
      expect(isBinaryFile('file', '/project/Makefile')).toBe(false);
    });
  });

  describe('binary image files', () => {
    it('returns true for .png files', () => {
      expect(isBinaryFile('file', '/project/logo.png')).toBe(true);
    });

    it('returns true for .jpg files', () => {
      expect(isBinaryFile('file', '/project/photo.jpg')).toBe(true);
    });

    it('returns true for .jpeg files', () => {
      expect(isBinaryFile('file', '/project/photo.jpeg')).toBe(true);
    });

    it('returns true for .gif files', () => {
      expect(isBinaryFile('file', '/project/animation.gif')).toBe(true);
    });

    it('returns true for .svg files', () => {
      expect(isBinaryFile('file', '/project/icon.svg')).toBe(true);
    });
  });

  describe('binary archive files', () => {
    it('returns true for .zip files', () => {
      expect(isBinaryFile('file', '/project/archive.zip')).toBe(true);
    });

    it('returns true for .tar files', () => {
      expect(isBinaryFile('file', '/project/archive.tar')).toBe(true);
    });
  });

  describe('binary executable files', () => {
    it('returns true for .exe files', () => {
      expect(isBinaryFile('file', '/project/app.exe')).toBe(true);
    });

    it('returns true for .dll files', () => {
      expect(isBinaryFile('file', '/project/library.dll')).toBe(true);
    });
  });

  describe('binary database files', () => {
    it('returns true for .db files', () => {
      expect(isBinaryFile('file', '/project/database.db')).toBe(true);
    });

    it('returns true for .sqlite files', () => {
      expect(isBinaryFile('file', '/project/database.sqlite')).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase extensions', () => {
      expect(isBinaryFile('file', '/project/LOGO.PNG')).toBe(true);
    });

    it('handles mixed case extensions', () => {
      expect(isBinaryFile('file', '/project/Photo.JpEg')).toBe(true);
    });
  });
});
