import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import { createMockVscodeAdapter } from '../../helpers/mockVSCode';
import { EditorTextInserter } from '../../../destinations/capabilities/EditorTextInserter';

describe('EditorTextInserter', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();
  const testContext = { fn: 'test' };

  const mockEditor = {
    document: {
      uri: { toString: (): string => 'file:///test.ts' },
    },
  } as unknown as vscode.TextEditor;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('insert()', () => {
    it('should insert text at cursor position', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      await inserter.insert('test text', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor, 'test text');

      spy.mockRestore();
    });

    it('should log on success', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      await inserter.insert('test text', testContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
          editorUri: 'file:///test.ts',
        }),
        'Cursor insert succeeded',
      );

      spy.mockRestore();
    });

    it('should log on failure', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(false);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      await inserter.insert('test text', testContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
          editorUri: 'file:///test.ts',
        }),
        'Cursor insert failed',
      );

      spy.mockRestore();
    });

    it('should return true when insertion succeeds', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(true);

      spy.mockRestore();
    });

    it('should return false when insertion fails', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(false);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(false);

      spy.mockRestore();
    });

    it('should handle untitled documents', async () => {
      const untitledEditor = {
        document: {
          uri: { toString: (): string => 'untitled:Untitled-1' },
        },
      } as unknown as vscode.TextEditor;

      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, untitledEditor, mockLogger);

      await inserter.insert('test text', testContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
          editorUri: 'untitled:Untitled-1',
        }),
        'Cursor insert succeeded',
      );

      spy.mockRestore();
    });

    it('should handle empty text insertion', async () => {
      const spy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValueOnce(true);

      const inserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      const result = await inserter.insert('', testContext);

      expect(result).toStrictEqual(true);
      expect(spy).toHaveBeenCalledWith(mockEditor, '');

      spy.mockRestore();
    });
  });
});
