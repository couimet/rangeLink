import { createMockLogger } from 'barebone-logger-testing';

import { ClipboardTextInserter } from '../../../destinations/capabilities/ClipboardTextInserter';
import { createMockVscodeAdapter } from '../../helpers';

describe('ClipboardTextInserter', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();
  const testContext = { fn: 'test' };

  describe('insert()', () => {
    it('should copy text to clipboard before paste', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        undefined,
        mockLogger,
      );

      await inserter.insert('test text', testContext);

      expect(clipboardSpy).toHaveBeenCalledTimes(1);
      expect(clipboardSpy).toHaveBeenCalledWith('test text');

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should call beforePaste hook if provided', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      const beforePaste = jest.fn().mockResolvedValue(undefined);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        beforePaste,
        mockLogger,
      );

      await inserter.insert('test text', testContext);

      expect(beforePaste).toHaveBeenCalledTimes(1);

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should wait for focus delay', async () => {
      jest.useFakeTimers();

      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        undefined,
        mockLogger,
      );

      const insertPromise = inserter.insert('test text', testContext);

      // Fast-forward all timers
      await jest.runAllTimersAsync();

      await insertPromise;

      expect(commandSpy).toHaveBeenCalled();

      jest.useRealTimers();
      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should try each command until success', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('Command 1 failed'))
        .mockResolvedValueOnce(undefined); // Command 2 succeeds

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['command1', 'command2', 'command3'],
        undefined,
        mockLogger,
      );

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(true);
      expect(commandSpy).toHaveBeenCalledTimes(2);
      expect(commandSpy).toHaveBeenNthCalledWith(1, 'command1');
      expect(commandSpy).toHaveBeenNthCalledWith(2, 'command2');

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should log on success', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        undefined,
        mockLogger,
      );

      await inserter.insert('test text', testContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test', command: 'editor.action.clipboardPasteAction' },
        'Clipboard paste succeeded',
      );

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should log on failure (all commands failed)', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValue(new Error('All commands failed'));

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['command1', 'command2'],
        undefined,
        mockLogger,
      );

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test', allCommandsFailed: true },
        'All clipboard paste commands failed',
      );

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should return true when first command succeeds', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        undefined,
        mockLogger,
      );

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(true);

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should return false when all commands fail', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValue(new Error('Command failed'));

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['command1', 'command2'],
        undefined,
        mockLogger,
      );

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(false);

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should log debug message with text length when copying to clipboard', async () => {
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        undefined,
        mockLogger,
      );

      await inserter.insert('test text', testContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', textLength: 9 },
        'Copied text to clipboard',
      );

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });

    it('should log debug message for each failed command', async () => {
      const error1 = new Error('Command 1 failed');
      const error2 = new Error('Command 2 failed');
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);
      const commandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['command1', 'command2'],
        undefined,
        mockLogger,
      );

      await inserter.insert('test text', testContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', command: 'command1', error: error1 },
        'Paste command failed, trying next',
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', command: 'command2', error: error2 },
        'Paste command failed, trying next',
      );

      clipboardSpy.mockRestore();
      commandSpy.mockRestore();
    });
  });
});
