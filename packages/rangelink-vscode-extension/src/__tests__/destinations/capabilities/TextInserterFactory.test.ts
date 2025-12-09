import { createMockLogger } from 'barebone-logger-testing';

import { ClipboardTextInserter } from '../../../destinations/capabilities/ClipboardTextInserter';
import { EditorTextInserter } from '../../../destinations/capabilities/EditorTextInserter';
import { NativeCommandTextInserter } from '../../../destinations/capabilities/NativeCommandTextInserter';
import { TextInserterFactory } from '../../../destinations/capabilities/TextInserterFactory';
import { createMockEditor } from '../../helpers/createMockEditor';
import { createMockVscodeAdapter } from '../../helpers/mockVSCode';

describe('TextInserterFactory', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();

  describe('createClipboardInserter()', () => {
    it('should create ClipboardTextInserter instance', () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);

      const inserter = factory.createClipboardInserter(['editor.action.clipboardPasteAction']);

      expect(inserter).toBeInstanceOf(ClipboardTextInserter);
    });

    it('should pass pasteCommands to ClipboardTextInserter', async () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);
      const pasteCommands = ['command1', 'command2'];
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);

      const inserter = factory.createClipboardInserter(pasteCommands);
      await inserter.insert('test', { fn: 'test' });

      expect(commandSpy).toHaveBeenCalledWith('command1');
    });

    it('should pass beforePaste callback to ClipboardTextInserter', async () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);
      const beforePaste = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);

      const inserter = factory.createClipboardInserter(['paste'], beforePaste);
      await inserter.insert('test', { fn: 'test' });

      expect(beforePaste).toHaveBeenCalledTimes(1);
    });

    it('should work without beforePaste callback', () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);

      const inserter = factory.createClipboardInserter(['paste']);

      expect(inserter).toBeInstanceOf(ClipboardTextInserter);
    });
  });

  describe('createNativeCommandInserter()', () => {
    it('should create NativeCommandTextInserter instance', () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);

      const inserter = factory.createNativeCommandInserter('test.command', (text) => ({ text }));

      expect(inserter).toBeInstanceOf(NativeCommandTextInserter);
    });

    it('should pass command and buildCommandArgs to NativeCommandTextInserter', async () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);
      const buildArgs = (text: string) => ({ query: text, partial: true });
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const inserter = factory.createNativeCommandInserter('copilot.insert', buildArgs);
      await inserter.insert('hello', { fn: 'test' });

      expect(commandSpy).toHaveBeenCalledTimes(1);
      expect(commandSpy).toHaveBeenCalledWith('copilot.insert', { query: 'hello', partial: true });
    });
  });

  describe('createEditorInserter()', () => {
    it('should create EditorTextInserter instance', () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);
      const mockEditor = createMockEditor();

      const inserter = factory.createEditorInserter(mockEditor);

      expect(inserter).toBeInstanceOf(EditorTextInserter);
    });

    it('should pass editor to EditorTextInserter', async () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);
      const mockEditor = createMockEditor();
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const inserter = factory.createEditorInserter(mockEditor);
      await inserter.insert('text', { fn: 'test' });

      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(insertSpy).toHaveBeenCalledWith(mockEditor, 'text');
    });
  });

  describe('factory reuse', () => {
    it('should create multiple inserters with same dependencies', () => {
      const factory = new TextInserterFactory(mockAdapter, mockLogger);

      const clipboard1 = factory.createClipboardInserter(['paste1']);
      const clipboard2 = factory.createClipboardInserter(['paste2']);
      const native = factory.createNativeCommandInserter('cmd', (t) => ({ t }));
      const editor = factory.createEditorInserter(createMockEditor());

      expect(clipboard1).toBeInstanceOf(ClipboardTextInserter);
      expect(clipboard2).toBeInstanceOf(ClipboardTextInserter);
      expect(native).toBeInstanceOf(NativeCommandTextInserter);
      expect(editor).toBeInstanceOf(EditorTextInserter);

      // Each call creates a new instance
      expect(clipboard1).not.toBe(clipboard2);
    });
  });
});
