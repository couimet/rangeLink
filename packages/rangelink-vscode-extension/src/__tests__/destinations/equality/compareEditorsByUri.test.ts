import { compareEditorsByUri } from '../../../destinations/equality/compareEditorsByUri';
import {
  createMockDocument,
  createMockEditor,
  createMockEditorComposablePasteDestination,
  createMockSingletonComposablePasteDestination,
  createMockUri,
} from '../../helpers';

describe('compareEditorsByUri', () => {
  describe('when editors have matching URIs', () => {
    it('should return true', async () => {
      const uri = createMockUri('/path/to/file.ts');
      const thisEditor = createMockEditor({ document: createMockDocument({ uri }) });
      const otherDestination = createMockTextEditorDestination({
        editor: createMockEditor({ document: createMockDocument({ uri }) }),
      });

      const result = await compareEditorsByUri(thisEditor, otherDestination);

      expect(result).toBe(true);
    });
  });

  describe('when editors have different URIs', () => {
    it('should return false', async () => {
      const thisEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/path/to/file1.ts') }),
      });
      const otherDestination = createMockTextEditorDestination({
        editor: createMockEditor({
          document: createMockDocument({ uri: createMockUri('/path/to/file2.ts') }),
        }),
      });

      const result = await compareEditorsByUri(thisEditor, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when other destination has no editor property', () => {
    it('should return false', async () => {
      const thisEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/path/to/file.ts') }),
      });
      const otherDestination = createMockTextEditorDestination();

      const result = await compareEditorsByUri(thisEditor, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('file:// URI handling', () => {
    it('should correctly compare file:// URIs', async () => {
      const uri = createMockUri('/Users/user/project/src/index.ts');
      const thisEditor = createMockEditor({ document: createMockDocument({ uri }) });
      const otherDestination = createMockTextEditorDestination({
        editor: createMockEditor({ document: createMockDocument({ uri }) }),
      });

      const result = await compareEditorsByUri(thisEditor, otherDestination);

      expect(result).toBe(true);
    });

    it('should return false for different file paths', async () => {
      const thisEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/Users/user/project/src/index.ts') }),
      });
      const otherDestination = createMockTextEditorDestination({
        editor: createMockEditor({
          document: createMockDocument({ uri: createMockUri('/Users/user/project/src/other.ts') }),
        }),
      });

      const result = await compareEditorsByUri(thisEditor, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('untitled URI handling', () => {
    it('should correctly compare untitled URIs', async () => {
      const uri = createMockUri('untitled:Untitled-1', { scheme: 'untitled' });
      const thisEditor = createMockEditor({ document: createMockDocument({ uri }) });
      const otherDestination = createMockTextEditorDestination({
        editor: createMockEditor({ document: createMockDocument({ uri }) }),
      });

      const result = await compareEditorsByUri(thisEditor, otherDestination);

      expect(result).toBe(true);
    });

    it('should return false for different untitled documents', async () => {
      const thisEditor = createMockEditor({
        document: createMockDocument({
          uri: createMockUri('untitled:Untitled-1', { scheme: 'untitled' }),
        }),
      });
      const otherDestination = createMockTextEditorDestination({
        editor: createMockEditor({
          document: createMockDocument({
            uri: createMockUri('untitled:Untitled-2', { scheme: 'untitled' }),
          }),
        }),
      });

      const result = await compareEditorsByUri(thisEditor, otherDestination);

      expect(result).toBe(false);
    });

    it('should return false when comparing file to untitled', async () => {
      const thisEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/path/to/file.ts') }),
      });
      const otherDestination = createMockTextEditorDestination({
        editor: createMockEditor({
          document: createMockDocument({
            uri: createMockUri('untitled:Untitled-1', { scheme: 'untitled' }),
          }),
        }),
      });

      const result = await compareEditorsByUri(thisEditor, otherDestination);

      expect(result).toBe(false);
    });
  });
});
