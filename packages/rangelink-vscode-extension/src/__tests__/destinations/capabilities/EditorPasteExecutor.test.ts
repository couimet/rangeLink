import { createMockLogger } from 'barebone-logger-testing';

import { EditorPasteExecutor } from '../../../destinations/capabilities/EditorPasteExecutor';
import { FocusErrorReason } from '../../../destinations/capabilities/PasteExecutor';
import {
  createMockDocument,
  createMockEditor,
  createMockUri,
  createMockVscodeAdapter,
} from '../../helpers';

describe('EditorPasteExecutor', () => {
  const mockLogger = createMockLogger();

  describe('focus()', () => {
    it('should call showTextDocument with document URI and viewColumn', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const documentUri = createMockUri('/workspace/file.ts');
      const viewColumn = 2;
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: documentUri }),
        viewColumn,
      });

      const showDocSpy = jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);

      const executor = new EditorPasteExecutor(mockAdapter, documentUri, viewColumn, mockLogger);

      await executor.focus({ fn: 'test' });

      expect(showDocSpy).toHaveBeenCalledWith(documentUri, { viewColumn: 2 });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', editorUri: documentUri.toString() },
        'Editor focused via showTextDocument()',
      );
    });

    it('should return insert function that uses fresh editor from showTextDocument (issue #181)', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const documentUri = createMockUri('/workspace/file.ts');

      const freshEditor = createMockEditor({
        document: createMockDocument({ uri: documentUri }),
        viewColumn: 2,
      });

      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(freshEditor);
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const executor = new EditorPasteExecutor(mockAdapter, documentUri, 2, mockLogger);

      const result = await executor.focus({ fn: 'test' });

      expect(result.success).toBe(true);
      if (result.success) {
        await result.value.insert('test content', { fn: 'insert' });

        expect(insertSpy).toHaveBeenCalledWith(freshEditor, 'test content');
      }
    });

    it('should return error when showTextDocument fails', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const documentUri = createMockUri('/workspace/file.ts');
      const testError = new Error('Editor closed');

      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(testError);

      const executor = new EditorPasteExecutor(mockAdapter, documentUri, 1, mockLogger);

      const result = await executor.focus({ fn: 'test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.reason).toBe(FocusErrorReason.SHOW_DOCUMENT_FAILED);
        expect(result.error.cause).toBe(testError);
      }
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'test', editorUri: documentUri.toString(), error: testError },
        'Failed to focus editor',
      );
    });

    it('should handle undefined viewColumn', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const documentUri = createMockUri('/workspace/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: documentUri }),
      });

      const showDocSpy = jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);

      const executor = new EditorPasteExecutor(mockAdapter, documentUri, undefined, mockLogger);

      await executor.focus({ fn: 'test' });

      expect(showDocSpy).toHaveBeenCalledWith(documentUri, { viewColumn: undefined });
    });
  });

  describe('insert function', () => {
    it('should log success when insertTextAtCursor returns true', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const documentUri = createMockUri('/workspace/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: documentUri }),
      });

      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const executor = new EditorPasteExecutor(mockAdapter, documentUri, 1, mockLogger);
      const result = await executor.focus({ fn: 'test' });

      if (result.success) {
        const insertResult = await result.value.insert('text', { fn: 'insert' });

        expect(insertResult).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          { fn: 'insert', editorUri: documentUri.toString() },
          'Cursor insert succeeded',
        );
      }
    });

    it('should log failure when insertTextAtCursor returns false', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const documentUri = createMockUri('/workspace/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: documentUri }),
      });

      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(false);

      const executor = new EditorPasteExecutor(mockAdapter, documentUri, 1, mockLogger);
      const result = await executor.focus({ fn: 'test' });

      if (result.success) {
        const insertResult = await result.value.insert('text', { fn: 'insert' });

        expect(insertResult).toBe(false);
        expect(mockLogger.info).toHaveBeenCalledWith(
          { fn: 'insert', editorUri: documentUri.toString() },
          'Cursor insert failed',
        );
      }
    });

    it('should catch exception and return false', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const documentUri = createMockUri('/workspace/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: documentUri }),
      });
      const insertError = new Error('Insert failed');

      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      jest.spyOn(mockAdapter, 'insertTextAtCursor').mockRejectedValue(insertError);

      const executor = new EditorPasteExecutor(mockAdapter, documentUri, 1, mockLogger);
      const result = await executor.focus({ fn: 'test' });

      if (result.success) {
        const insertResult = await result.value.insert('text', { fn: 'insert' });

        expect(insertResult).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          { fn: 'insert', editorUri: documentUri.toString(), error: insertError },
          'Cursor insert threw exception',
        );
      }
    });
  });
});
