import { isTextLikeFile } from '..';
import { createMockDocument } from '../../__tests__/helpers/createMockDocument';
import { createMockEditor } from '../../__tests__/helpers/createMockEditor';
import { createMockUri } from '../../__tests__/helpers/createMockUri';
import { createMockVscodeAdapter } from '../../__tests__/helpers/createMockVscodeAdapter';
import { createWindowOptionsForEditor } from '../../__tests__/helpers/createWindowOptionsForEditor';

const createEditorWithUri = (fsPath: string, scheme: string) => {
  const mockUri = createMockUri(fsPath, { scheme });
  const mockDocument = createMockDocument({ uri: mockUri });
  const mockEditor = createMockEditor({ document: mockDocument });
  const mockAdapter = createMockVscodeAdapter({
    windowOptions: createWindowOptionsForEditor(mockEditor),
  });
  return { editor: mockEditor, adapter: mockAdapter };
};

describe('isTextLikeFile', () => {
  describe('scheme filtering', () => {
    it('should return false for git:// scheme', () => {
      const { editor, adapter } = createEditorWithUri('/repo/file.ts', 'git');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(false);
    });

    it('should return false for output:// scheme', () => {
      const { editor, adapter } = createEditorWithUri('/output/channel', 'output');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(false);
    });

    it('should return false for vscode-remote:// scheme', () => {
      const { editor, adapter } = createEditorWithUri('/remote/file.ts', 'vscode-remote');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(false);
    });
  });

  describe('untitled scheme handling', () => {
    it('should return true for untitled:// scheme (always text-like)', () => {
      const { editor, adapter } = createEditorWithUri('Untitled-1', 'untitled');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(true);
    });

    it('should return true for untitled even with binary-like path', () => {
      // Untitled files can have any name - scheme takes precedence
      const { editor, adapter } = createEditorWithUri('image.png', 'untitled');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(true);
    });
  });

  describe('file scheme with text-like extensions', () => {
    it('should return true for .ts files', () => {
      const { editor, adapter } = createEditorWithUri('/project/src/index.ts', 'file');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(true);
    });

    it('should return true for .js files', () => {
      const { editor, adapter } = createEditorWithUri('/project/src/utils.js', 'file');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(true);
    });

    it('should return true for .md files', () => {
      const { editor, adapter } = createEditorWithUri('/project/README.md', 'file');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(true);
    });

    it('should return true for extensionless files', () => {
      const { editor, adapter } = createEditorWithUri('/project/Makefile', 'file');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(true);
    });
  });

  describe('file scheme with binary extensions', () => {
    describe('image files', () => {
      it('should return false for .png files', () => {
        const { editor, adapter } = createEditorWithUri('/project/logo.png', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .jpg files', () => {
        const { editor, adapter } = createEditorWithUri('/project/photo.jpg', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .jpeg files', () => {
        const { editor, adapter } = createEditorWithUri('/project/photo.jpeg', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .gif files', () => {
        const { editor, adapter } = createEditorWithUri('/project/animation.gif', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .bmp files', () => {
        const { editor, adapter } = createEditorWithUri('/project/image.bmp', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .ico files', () => {
        const { editor, adapter } = createEditorWithUri('/project/favicon.ico', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .svg files', () => {
        const { editor, adapter } = createEditorWithUri('/project/icon.svg', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });
    });

    describe('document files', () => {
      it('should return false for .pdf files', () => {
        const { editor, adapter } = createEditorWithUri('/project/document.pdf', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });
    });

    describe('archive files', () => {
      it('should return false for .zip files', () => {
        const { editor, adapter } = createEditorWithUri('/project/archive.zip', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .tar files', () => {
        const { editor, adapter } = createEditorWithUri('/project/archive.tar', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .gz files', () => {
        const { editor, adapter } = createEditorWithUri('/project/archive.gz', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .7z files', () => {
        const { editor, adapter } = createEditorWithUri('/project/archive.7z', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .rar files', () => {
        const { editor, adapter } = createEditorWithUri('/project/archive.rar', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });
    });

    describe('executable files', () => {
      it('should return false for .exe files', () => {
        const { editor, adapter } = createEditorWithUri('/project/app.exe', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .dll files', () => {
        const { editor, adapter } = createEditorWithUri('/project/library.dll', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });
    });

    describe('data files', () => {
      it('should return false for .bin files', () => {
        const { editor, adapter } = createEditorWithUri('/project/data.bin', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .dat files', () => {
        const { editor, adapter } = createEditorWithUri('/project/data.dat', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });
    });

    describe('database files', () => {
      it('should return false for .db files', () => {
        const { editor, adapter } = createEditorWithUri('/project/database.db', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });

      it('should return false for .sqlite files', () => {
        const { editor, adapter } = createEditorWithUri('/project/database.sqlite', 'file');

        const result = isTextLikeFile(adapter, editor);

        expect(result).toBe(false);
      });
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase extensions (path lowercased)', () => {
      const { editor, adapter } = createEditorWithUri('/project/LOGO.PNG', 'file');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(false);
    });

    it('should handle mixed case extensions', () => {
      const { editor, adapter } = createEditorWithUri('/project/Photo.JpEg', 'file');

      const result = isTextLikeFile(adapter, editor);

      expect(result).toBe(false);
    });
  });
});
