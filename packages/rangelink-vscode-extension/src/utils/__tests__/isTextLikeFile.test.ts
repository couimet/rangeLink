import { isTextLikeFile } from '..';

describe('isTextLikeFile', () => {
  describe('scheme filtering', () => {
    it('should return false for git scheme', () => {
      expect(isTextLikeFile('git', '/repo/file.ts')).toBe(false);
    });

    it('should return false for output scheme', () => {
      expect(isTextLikeFile('output', '/output/channel')).toBe(false);
    });

    it('should return false for vscode-remote scheme', () => {
      expect(isTextLikeFile('vscode-remote', '/remote/file.ts')).toBe(false);
    });
  });

  describe('untitled scheme handling', () => {
    it('should return true for untitled scheme (always text-like)', () => {
      expect(isTextLikeFile('untitled', 'Untitled-1')).toBe(true);
    });

    it('should return true for untitled even with binary-like path', () => {
      expect(isTextLikeFile('untitled', 'image.png')).toBe(true);
    });
  });

  describe('file scheme with text-like extensions', () => {
    it('should return true for .ts files', () => {
      expect(isTextLikeFile('file', '/project/src/index.ts')).toBe(true);
    });

    it('should return true for .js files', () => {
      expect(isTextLikeFile('file', '/project/src/utils.js')).toBe(true);
    });

    it('should return true for .md files', () => {
      expect(isTextLikeFile('file', '/project/README.md')).toBe(true);
    });

    it('should return true for extensionless files', () => {
      expect(isTextLikeFile('file', '/project/Makefile')).toBe(true);
    });
  });

  describe('file scheme with binary extensions', () => {
    describe('image files', () => {
      it('should return false for .png files', () => {
        expect(isTextLikeFile('file', '/project/logo.png')).toBe(false);
      });

      it('should return false for .jpg files', () => {
        expect(isTextLikeFile('file', '/project/photo.jpg')).toBe(false);
      });

      it('should return false for .jpeg files', () => {
        expect(isTextLikeFile('file', '/project/photo.jpeg')).toBe(false);
      });

      it('should return false for .gif files', () => {
        expect(isTextLikeFile('file', '/project/animation.gif')).toBe(false);
      });

      it('should return false for .bmp files', () => {
        expect(isTextLikeFile('file', '/project/image.bmp')).toBe(false);
      });

      it('should return false for .ico files', () => {
        expect(isTextLikeFile('file', '/project/favicon.ico')).toBe(false);
      });

      it('should return false for .svg files', () => {
        expect(isTextLikeFile('file', '/project/icon.svg')).toBe(false);
      });
    });

    describe('document files', () => {
      it('should return false for .pdf files', () => {
        expect(isTextLikeFile('file', '/project/document.pdf')).toBe(false);
      });
    });

    describe('archive files', () => {
      it('should return false for .zip files', () => {
        expect(isTextLikeFile('file', '/project/archive.zip')).toBe(false);
      });

      it('should return false for .tar files', () => {
        expect(isTextLikeFile('file', '/project/archive.tar')).toBe(false);
      });

      it('should return false for .gz files', () => {
        expect(isTextLikeFile('file', '/project/archive.gz')).toBe(false);
      });

      it('should return false for .7z files', () => {
        expect(isTextLikeFile('file', '/project/archive.7z')).toBe(false);
      });

      it('should return false for .rar files', () => {
        expect(isTextLikeFile('file', '/project/archive.rar')).toBe(false);
      });
    });

    describe('executable files', () => {
      it('should return false for .exe files', () => {
        expect(isTextLikeFile('file', '/project/app.exe')).toBe(false);
      });

      it('should return false for .dll files', () => {
        expect(isTextLikeFile('file', '/project/library.dll')).toBe(false);
      });
    });

    describe('data files', () => {
      it('should return false for .bin files', () => {
        expect(isTextLikeFile('file', '/project/data.bin')).toBe(false);
      });

      it('should return false for .dat files', () => {
        expect(isTextLikeFile('file', '/project/data.dat')).toBe(false);
      });
    });

    describe('database files', () => {
      it('should return false for .db files', () => {
        expect(isTextLikeFile('file', '/project/database.db')).toBe(false);
      });

      it('should return false for .sqlite files', () => {
        expect(isTextLikeFile('file', '/project/database.sqlite')).toBe(false);
      });
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase extensions (path lowercased)', () => {
      expect(isTextLikeFile('file', '/project/LOGO.PNG')).toBe(false);
    });

    it('should handle mixed case extensions', () => {
      expect(isTextLikeFile('file', '/project/Photo.JpEg')).toBe(false);
    });
  });
});
