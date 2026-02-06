import { createMockLogger } from 'barebone-logger-testing';

import { EditorInsertFactory } from '../../../../destinations/capabilities/insertFactories/editorInsertFactory';
import {
  createMockDocument,
  createMockEditor,
  createMockUri,
  createMockVscodeAdapter,
} from '../../../helpers';

describe('EditorInsertFactory', () => {
  const mockLogger = createMockLogger();

  const createTestEditor = (uriPath: string) => {
    const uri = createMockUri(uriPath);
    return createMockEditor({
      document: createMockDocument({ uri }),
    });
  };

  it('creates an insert function that inserts text at cursor', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const mockEditor = createTestEditor('/path/to/file.ts');
    const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

    const factory = new EditorInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget(mockEditor);

    const result = await insertFn('test content');

    expect(result).toBe(true);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(mockEditor, 'test content');
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'EditorInsertFactory.insert', editorUri: 'file:///path/to/file.ts' },
      'Editor insert succeeded',
    );
  });

  it('returns false when insertTextAtCursor returns false', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const mockEditor = createTestEditor('/path/to/file.ts');
    jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(false);

    const factory = new EditorInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget(mockEditor);

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'EditorInsertFactory.insert', editorUri: 'file:///path/to/file.ts' },
      'Editor insert failed',
    );
  });

  it('returns false when insertTextAtCursor throws an error', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const mockEditor = createTestEditor('/path/to/file.ts');
    const testError = new Error('Insert threw');
    jest.spyOn(mockAdapter, 'insertTextAtCursor').mockRejectedValue(testError);

    const factory = new EditorInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget(mockEditor);

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'EditorInsertFactory.insert', editorUri: 'file:///path/to/file.ts', error: testError },
      'Editor insert threw exception',
    );
  });

  it('captures editor reference in closure', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const editor1 = createTestEditor('/file1.ts');
    const editor2 = createTestEditor('/file2.ts');
    const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

    const factory = new EditorInsertFactory(mockAdapter, mockLogger);
    const insertFn1 = factory.forTarget(editor1);
    const insertFn2 = factory.forTarget(editor2);

    await insertFn1('content for editor 1');
    await insertFn2('content for editor 2');

    expect(insertSpy).toHaveBeenNthCalledWith(1, editor1, 'content for editor 1');
    expect(insertSpy).toHaveBeenNthCalledWith(2, editor2, 'content for editor 2');
  });
});
