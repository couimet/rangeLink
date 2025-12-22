import { createMockLogger } from 'barebone-logger-testing';

import { ClipboardTextInserter } from '../../../destinations/capabilities/ClipboardTextInserter';
import {
  createMockClipboard,
  createMockCommands,
  createMockVscodeAdapter,
  type MockClipboard,
  type MockCommands,
  type VscodeAdapterWithTestHooks,
} from '../../helpers';

describe('ClipboardTextInserter', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockClipboard: MockClipboard;
  let mockCommands: MockCommands;
  let mockAdapter: VscodeAdapterWithTestHooks;
  const testContext = { fn: 'test' };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockClipboard = createMockClipboard();
    mockCommands = createMockCommands();
    mockAdapter = createMockVscodeAdapter({
      envOptions: { clipboard: mockClipboard },
      commandsOptions: mockCommands,
    });
  });

  describe('insert()', () => {
    it('should copy text to clipboard before paste', async () => {
      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        undefined,
        mockLogger,
      );

      await inserter.insert('test text', testContext);

      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
    });

    it('should call beforePaste hook if provided', async () => {
      const beforePaste = jest.fn().mockResolvedValue(undefined);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        beforePaste,
        mockLogger,
      );

      await inserter.insert('test text', testContext);

      expect(beforePaste).toHaveBeenCalledTimes(1);
    });

    it('should wait for focus delay', async () => {
      jest.useFakeTimers();

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        undefined,
        mockLogger,
      );

      const insertPromise = inserter.insert('test text', testContext);

      await jest.runAllTimersAsync();

      await insertPromise;

      expect(mockCommands.executeCommand).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should try each command until success', async () => {
      mockCommands.executeCommand
        .mockRejectedValueOnce(new Error('Command 1 failed'))
        .mockResolvedValueOnce(undefined);

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['command1', 'command2', 'command3'],
        undefined,
        mockLogger,
      );

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(true);
      expect(mockCommands.executeCommand).toHaveBeenCalledTimes(2);
      expect(mockCommands.executeCommand).toHaveBeenNthCalledWith(1, 'command1');
      expect(mockCommands.executeCommand).toHaveBeenNthCalledWith(2, 'command2');
    });

    it('should log on success', async () => {
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
    });

    it('should log on failure (all commands failed)', async () => {
      mockCommands.executeCommand.mockRejectedValue(new Error('All commands failed'));

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
    });

    it('should return true when first command succeeds', async () => {
      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        undefined,
        mockLogger,
      );

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(true);
    });

    it('should return false when all commands fail', async () => {
      mockCommands.executeCommand.mockRejectedValue(new Error('Command failed'));

      const inserter = new ClipboardTextInserter(
        mockAdapter,
        ['command1', 'command2'],
        undefined,
        mockLogger,
      );

      const result = await inserter.insert('test text', testContext);

      expect(result).toStrictEqual(false);
    });

    it('should log debug message with text length when copying to clipboard', async () => {
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
    });

    it('should log debug message for each failed command', async () => {
      const error1 = new Error('Command 1 failed');
      const error2 = new Error('Command 2 failed');
      mockCommands.executeCommand.mockRejectedValueOnce(error1).mockRejectedValueOnce(error2);

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
    });
  });
});
