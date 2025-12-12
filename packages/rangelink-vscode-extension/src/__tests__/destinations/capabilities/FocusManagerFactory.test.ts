import { createMockLogger } from 'barebone-logger-testing';

import { CommandFocusManager } from '../../../destinations/capabilities/CommandFocusManager';
import { EditorFocusManager } from '../../../destinations/capabilities/EditorFocusManager';
import { FocusManagerFactory } from '../../../destinations/capabilities/FocusManagerFactory';
import { TerminalFocusManager } from '../../../destinations/capabilities/TerminalFocusManager';
import { TerminalFocusType } from '../../../types/TerminalFocusType';
import { createMockEditor, createMockTerminal, createMockVscodeAdapter } from '../../helpers';

describe('FocusManagerFactory', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();

  describe('createTerminalFocus()', () => {
    it('should create TerminalFocusManager instance', () => {
      const factory = new FocusManagerFactory(mockAdapter, mockLogger);
      const terminal = createMockTerminal();

      const manager = factory.createTerminalFocus(terminal);

      expect(manager).toBeInstanceOf(TerminalFocusManager);
    });

    it('should pass terminal to TerminalFocusManager', async () => {
      const factory = new FocusManagerFactory(mockAdapter, mockLogger);
      const terminal = createMockTerminal({ name: 'Test Terminal' });
      const showSpy = jest.spyOn(mockAdapter, 'showTerminal').mockReturnValue(undefined);

      const manager = factory.createTerminalFocus(terminal);
      await manager.focus({ fn: 'test' });

      expect(showSpy).toHaveBeenCalledTimes(1);
      expect(showSpy).toHaveBeenCalledWith(terminal, TerminalFocusType.StealFocus);
    });
  });

  describe('createEditorFocus()', () => {
    it('should create EditorFocusManager instance', () => {
      const factory = new FocusManagerFactory(mockAdapter, mockLogger);
      const editor = createMockEditor();

      const manager = factory.createEditorFocus(editor);

      expect(manager).toBeInstanceOf(EditorFocusManager);
    });

    it('should pass editor to EditorFocusManager', async () => {
      const factory = new FocusManagerFactory(mockAdapter, mockLogger);
      const editor = createMockEditor({ viewColumn: 2 });
      const showSpy = jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(editor);

      const manager = factory.createEditorFocus(editor);
      await manager.focus({ fn: 'test' });

      expect(showSpy).toHaveBeenCalledTimes(1);
      expect(showSpy).toHaveBeenCalledWith(editor.document.uri, { viewColumn: 2 });
    });
  });

  describe('createCommandFocus()', () => {
    it('should create CommandFocusManager instance', () => {
      const factory = new FocusManagerFactory(mockAdapter, mockLogger);

      const manager = factory.createCommandFocus(['focus.command']);

      expect(manager).toBeInstanceOf(CommandFocusManager);
    });

    it('should pass commands to CommandFocusManager', async () => {
      const factory = new FocusManagerFactory(mockAdapter, mockLogger);
      const commands = ['cmd1', 'cmd2', 'cmd3'];
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const manager = factory.createCommandFocus(commands);
      await manager.focus({ fn: 'test' });

      expect(commandSpy).toHaveBeenCalledTimes(1);
      expect(commandSpy).toHaveBeenCalledWith('cmd1');
    });

    it('should try next command when first fails', async () => {
      const factory = new FocusManagerFactory(mockAdapter, mockLogger);
      const commands = ['cmd1', 'cmd2'];
      const commandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('cmd1 failed'))
        .mockResolvedValueOnce(undefined);

      const manager = factory.createCommandFocus(commands);
      await manager.focus({ fn: 'test' });

      expect(commandSpy).toHaveBeenCalledTimes(2);
      expect(commandSpy).toHaveBeenNthCalledWith(1, 'cmd1');
      expect(commandSpy).toHaveBeenNthCalledWith(2, 'cmd2');
    });
  });

  describe('factory reuse', () => {
    it('should create multiple managers with same dependencies', () => {
      const factory = new FocusManagerFactory(mockAdapter, mockLogger);

      const terminal1 = factory.createTerminalFocus(createMockTerminal());
      const terminal2 = factory.createTerminalFocus(createMockTerminal());
      const editor = factory.createEditorFocus(createMockEditor());
      const command = factory.createCommandFocus(['cmd']);

      expect(terminal1).toBeInstanceOf(TerminalFocusManager);
      expect(terminal2).toBeInstanceOf(TerminalFocusManager);
      expect(editor).toBeInstanceOf(EditorFocusManager);
      expect(command).toBeInstanceOf(CommandFocusManager);

      // Each call creates a new instance
      expect(terminal1).not.toBe(terminal2);
    });
  });
});
