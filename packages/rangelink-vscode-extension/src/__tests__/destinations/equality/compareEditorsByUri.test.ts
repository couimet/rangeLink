import { compareEditorsByUri } from '../../../destinations/equality/compareEditorsByUri';
import {
  createMockCursorAIComposableDestination,
  createMockEditorComposablePasteDestination,
  createMockUri,
} from '../../helpers';

describe('compareEditorsByUri', () => {
  describe('when editors have matching URIs', () => {
    it('should return true', async () => {
      const uri = createMockUri('/path/to/file.ts');
      const otherDestination = createMockEditorComposablePasteDestination({
        uri,
      });

      const result = await compareEditorsByUri(uri, otherDestination);

      expect(result).toBe(true);
    });
  });

  describe('when editors have different URIs', () => {
    it('should return false', async () => {
      const thisUri = createMockUri('/path/to/file1.ts');
      const otherDestination = createMockEditorComposablePasteDestination({
        uri: createMockUri('/path/to/file2.ts'),
      });

      const result = await compareEditorsByUri(thisUri, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when other destination is not an editor', () => {
    it('should return false for singleton resource', async () => {
      const thisUri = createMockUri('/path/to/file.ts');
      const otherDestination = createMockCursorAIComposableDestination();

      const result = await compareEditorsByUri(thisUri, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('file:// URI handling', () => {
    it('should correctly compare file:// URIs', async () => {
      const uri = createMockUri('/Users/user/project/src/index.ts');
      const otherDestination = createMockEditorComposablePasteDestination({
        uri,
      });

      const result = await compareEditorsByUri(uri, otherDestination);

      expect(result).toBe(true);
    });

    it('should return false for different file paths', async () => {
      const thisUri = createMockUri('/Users/user/project/src/index.ts');
      const otherDestination = createMockEditorComposablePasteDestination({
        uri: createMockUri('/Users/user/project/src/other.ts'),
      });

      const result = await compareEditorsByUri(thisUri, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('untitled URI handling', () => {
    it('should correctly compare untitled URIs', async () => {
      const uri = createMockUri('untitled:Untitled-1', { scheme: 'untitled' });
      const otherDestination = createMockEditorComposablePasteDestination({
        uri,
      });

      const result = await compareEditorsByUri(uri, otherDestination);

      expect(result).toBe(true);
    });

    it('should return false for different untitled documents', async () => {
      const thisUri = createMockUri('untitled:Untitled-1', { scheme: 'untitled' });
      const otherDestination = createMockEditorComposablePasteDestination({
        uri: createMockUri('untitled:Untitled-2', { scheme: 'untitled' }),
      });

      const result = await compareEditorsByUri(thisUri, otherDestination);

      expect(result).toBe(false);
    });

    it('should return false when comparing file to untitled', async () => {
      const thisUri = createMockUri('/path/to/file.ts');
      const otherDestination = createMockEditorComposablePasteDestination({
        uri: createMockUri('untitled:Untitled-1', { scheme: 'untitled' }),
      });

      const result = await compareEditorsByUri(thisUri, otherDestination);

      expect(result).toBe(false);
    });
  });
});
