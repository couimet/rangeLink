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
  });
});
