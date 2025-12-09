import { createMockLogger } from 'barebone-logger-testing';

import { EditorTextInserter } from '../../../destinations/capabilities/EditorTextInserter';
import { createMockDocument } from '../../helpers/createMockDocument';
import { createMockEditor } from '../../helpers/createMockEditor';
import { createMockUntitledUri } from '../../helpers/createMockUntitledUri';
import { createMockUri } from '../../helpers/createMockUri';
import { createMockVscodeAdapter } from '../../helpers/mockVSCode';

describe('EditorTextInserter', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();
  const testContext = { fn: 'test' };

  const mockEditor = createMockEditor({
    document: createMockDocument({ uri: createMockUri('/test.ts') }),
  });

  describe('insert()', () => {
    it('should insert text at cursor position', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      await inserter.insert('test text', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor, 'test text');
    });

    it('should log on success', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      await inserter.insert('test text', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor, 'test text');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test', editorUri: 'file:///test.ts' },
        'Cursor insert succeeded',
      );
    });

    it('should log on failure', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(false);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      await inserter.insert('test text', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor, 'test text');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test', editorUri: 'file:///test.ts' },
        'Cursor insert failed',
      );
    });

    it('should return true when insertion succeeds', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      const result = await inserter.insert('test text', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor, 'test text');
      expect(result).toStrictEqual(true);
    });

    it('should return false when insertion fails', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(false);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      const result = await inserter.insert('test text', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor, 'test text');
      expect(result).toStrictEqual(false);
    });

    it('should handle untitled documents', async () => {
      const untitledEditor = createMockEditor({
        document: createMockDocument({
          uri: createMockUntitledUri('untitled:Untitled-1'),
        }),
      });

      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, untitledEditor, mockLogger);

      await inserter.insert('test text', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(untitledEditor, 'test text');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test', editorUri: 'untitled:Untitled-1' },
        'Cursor insert succeeded',
      );
    });

    it('should handle empty text insertion', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      const result = await inserter.insert('', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor, '');
      expect(result).toStrictEqual(true);
    });
  });
});
