import { createMockLogger } from 'barebone-logger-testing';

import { EditorFocusManager } from '../../../destinations/capabilities/EditorFocusManager';
import { createMockDocument } from '../../helpers/createMockDocument';
import { createMockEditor } from '../../helpers/createMockEditor';
import { createMockUntitledUri } from '../../helpers/createMockUntitledUri';
import { createMockUri } from '../../helpers/createMockUri';
import { createMockVscodeAdapter } from '../../helpers/mockVSCode';

describe('EditorFocusManager', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();
  const testContext = { fn: 'test' };

  const mockEditor = createMockEditor({
    document: createMockDocument({ uri: createMockUri('/test.ts') }),
    viewColumn: 1,
  });

  describe('focus()', () => {
    it('should call showTextDocument with uri and options', async () => {
      const spy = jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);

      const manager = new EditorFocusManager(mockAdapter, mockEditor, mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor.document.uri, {
        viewColumn: mockEditor.viewColumn,
      });
    });

    it('should log debug message on success', async () => {
      const spy = jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);

      const manager = new EditorFocusManager(mockAdapter, mockEditor, mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor.document.uri, {
        viewColumn: mockEditor.viewColumn,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', editorUri: 'file:///test.ts' },
        'Editor focused via showTextDocument()',
      );
    });

    it('should handle focus failure gracefully', async () => {
      const error = new Error('showTextDocument failed');
      const spy = jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(error);

      const manager = new EditorFocusManager(mockAdapter, mockEditor, mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor.document.uri, {
        viewColumn: mockEditor.viewColumn,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
          error,
        }),
        'Failed to focus editor',
      );

    });

    it('should not throw when focus fails', async () => {
      const spy = jest
        .spyOn(mockAdapter, 'showTextDocument')
        .mockRejectedValue(new Error('Failed'));

      const manager = new EditorFocusManager(mockAdapter, mockEditor, mockLogger);

      await expect(manager.focus(testContext)).resolves.not.toThrow();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockEditor.document.uri, {
        viewColumn: mockEditor.viewColumn,
      });
    });

    it('should handle untitled documents', async () => {
      const untitledEditor = createMockEditor({
        document: createMockDocument({
          uri: createMockUntitledUri('untitled:Untitled-1'),
        }),
        viewColumn: 1,
      });

      const spy = jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(untitledEditor);

      const manager = new EditorFocusManager(mockAdapter, untitledEditor, mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(untitledEditor.document.uri, {
        viewColumn: untitledEditor.viewColumn,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
          editorUri: 'untitled:Untitled-1',
        }),
        'Editor focused via showTextDocument()',
      );
    });
  });
});
