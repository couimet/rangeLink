import type { Logger, LoggingContext } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { ChatPasteHelper } from '../../destinations/ChatPasteHelper';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

describe('ChatPasteHelper', () => {
  let helper: ChatPasteHelper;
  let mockAdapter: VscodeAdapter;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.useFakeTimers();
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    helper = new ChatPasteHelper(mockAdapter, mockLogger);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('attemptPaste()', () => {
    const TEST_TEXT = 'test content to paste';
    const TEST_CONTEXT: LoggingContext = {
      fn: 'TestDestination.pasteContent',
      testMetadata: 'test value',
    };

    it('should successfully paste when first command succeeds', async () => {
      mockAdapter.writeTextToClipboard = jest.fn().mockResolvedValue(undefined);
      mockAdapter.executeCommand = jest.fn().mockResolvedValue(undefined);

      const pastePromise = helper.attemptPaste(TEST_TEXT, TEST_CONTEXT);

      // Advance timers to complete delay
      await jest.runAllTimersAsync();

      const result = await pastePromise;

      expect(mockAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
      expect(mockAdapter.writeTextToClipboard).toHaveBeenCalledWith(TEST_TEXT);

      expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(1);
      expect(mockAdapter.executeCommand).toHaveBeenCalledWith('editor.action.clipboardPasteAction');

      expect(result).toBe(true);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          textLength: TEST_TEXT.length,
        },
        'Copied text to clipboard',
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          delayMs: 200,
        },
        'Waiting for focus to complete before attempting paste',
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'editor.action.clipboardPasteAction',
        },
        'Automatic paste succeeded',
      );
    });

    it('should retry with second command when first command fails', async () => {
      mockAdapter.writeTextToClipboard = jest.fn().mockResolvedValue(undefined);

      const firstCommandError = new Error('First command failed');
      mockAdapter.executeCommand = jest
        .fn()
        .mockRejectedValueOnce(firstCommandError)
        .mockResolvedValueOnce(undefined);

      const pastePromise = helper.attemptPaste(TEST_TEXT, TEST_CONTEXT);
      await jest.runAllTimersAsync();
      const result = await pastePromise;

      expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(2);
      expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(
        1,
        'editor.action.clipboardPasteAction',
      );
      expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(2, 'execPaste');

      expect(result).toBe(true);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'editor.action.clipboardPasteAction',
          error: firstCommandError,
        },
        'Paste command failed, trying next',
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'execPaste',
        },
        'Automatic paste succeeded',
      );
    });

    it('should retry with third command when first two commands fail', async () => {
      mockAdapter.writeTextToClipboard = jest.fn().mockResolvedValue(undefined);

      const firstCommandError = new Error('First command failed');
      const secondCommandError = new Error('Second command failed');
      mockAdapter.executeCommand = jest
        .fn()
        .mockRejectedValueOnce(firstCommandError)
        .mockRejectedValueOnce(secondCommandError)
        .mockResolvedValueOnce(undefined);

      const pastePromise = helper.attemptPaste(TEST_TEXT, TEST_CONTEXT);
      await jest.runAllTimersAsync();
      const result = await pastePromise;

      expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(3);
      expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(
        1,
        'editor.action.clipboardPasteAction',
      );
      expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(2, 'execPaste');
      expect(mockAdapter.executeCommand).toHaveBeenNthCalledWith(3, 'paste');

      expect(result).toBe(true);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'editor.action.clipboardPasteAction',
          error: firstCommandError,
        },
        'Paste command failed, trying next',
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'execPaste',
          error: secondCommandError,
        },
        'Paste command failed, trying next',
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'paste',
        },
        'Automatic paste succeeded',
      );
    });

    it('should return false when all commands fail', async () => {
      mockAdapter.writeTextToClipboard = jest.fn().mockResolvedValue(undefined);

      const error1 = new Error('Command 1 failed');
      const error2 = new Error('Command 2 failed');
      const error3 = new Error('Command 3 failed');
      mockAdapter.executeCommand = jest
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(error3);

      const pastePromise = helper.attemptPaste(TEST_TEXT, TEST_CONTEXT);
      await jest.runAllTimersAsync();
      const result = await pastePromise;

      expect(mockAdapter.executeCommand).toHaveBeenCalledTimes(3);
      expect(result).toBe(false);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'editor.action.clipboardPasteAction',
          error: error1,
        },
        'Paste command failed, trying next',
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'execPaste',
          error: error2,
        },
        'Paste command failed, trying next',
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          command: 'paste',
          error: error3,
        },
        'Paste command failed, trying next',
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          ...TEST_CONTEXT,
          allCommandsFailed: true,
        },
        'All automatic paste commands failed - user will see manual paste instruction',
      );
    });
  });
});
