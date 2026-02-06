import { createMockLogger } from 'barebone-logger-testing';

import { FOCUS_TO_PASTE_DELAY_MS } from '../../../../constants/chatPasteConstants';
import { AIAssistantInsertFactory } from '../../../../destinations/capabilities/insertFactories/aiAssistantInsertFactory';
import { createMockVscodeAdapter } from '../../../helpers';

describe('AIAssistantInsertFactory', () => {
  const mockLogger = createMockLogger();

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an insert function that copies to clipboard and executes paste command', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const clipboardSpy = jest
      .spyOn(mockAdapter, 'writeTextToClipboard')
      .mockResolvedValue(undefined);
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValue(undefined);

    const factory = new AIAssistantInsertFactory(
      mockAdapter,
      ['editor.action.clipboardPasteAction'],
      mockLogger,
    );
    const insertFn = factory.forTarget();

    const resultPromise = insertFn('test content');
    await jest.advanceTimersByTimeAsync(FOCUS_TO_PASTE_DELAY_MS);
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(clipboardSpy).toHaveBeenCalledWith('test content');
    expect(executeCommandSpy).toHaveBeenCalledWith('editor.action.clipboardPasteAction');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'AIAssistantInsertFactory.insert', textLength: 12 },
      'Copied text to clipboard',
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'AIAssistantInsertFactory.insert', command: 'editor.action.clipboardPasteAction' },
      'Clipboard paste succeeded',
    );
  });

  it('waits for focus-to-paste delay before executing paste command', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValue(undefined);

    const factory = new AIAssistantInsertFactory(
      mockAdapter,
      ['editor.action.clipboardPasteAction'],
      mockLogger,
    );
    const insertFn = factory.forTarget();

    const resultPromise = insertFn('content');

    expect(executeCommandSpy).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(FOCUS_TO_PASTE_DELAY_MS);
    await resultPromise;

    expect(executeCommandSpy).toHaveBeenCalled();
  });

  it('tries multiple paste commands until one succeeds', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(new Error('First failed'))
      .mockResolvedValueOnce(undefined);

    const factory = new AIAssistantInsertFactory(
      mockAdapter,
      ['command.first', 'command.second'],
      mockLogger,
    );
    const insertFn = factory.forTarget();

    const resultPromise = insertFn('content');
    await jest.advanceTimersByTimeAsync(FOCUS_TO_PASTE_DELAY_MS);
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'command.first');
    expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'command.second');
  });

  it('returns false when all paste commands fail', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
    jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(new Error('First failed'))
      .mockRejectedValueOnce(new Error('Second failed'));

    const factory = new AIAssistantInsertFactory(
      mockAdapter,
      ['command.first', 'command.second'],
      mockLogger,
    );
    const insertFn = factory.forTarget();

    const resultPromise = insertFn('content');
    await jest.advanceTimersByTimeAsync(FOCUS_TO_PASTE_DELAY_MS);
    const result = await resultPromise;

    expect(result).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'AIAssistantInsertFactory.insert', allCommandsFailed: true },
      'All clipboard paste commands failed',
    );
  });

  it('returns false when clipboard write fails', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const clipboardError = new Error('Clipboard access denied');
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockRejectedValue(clipboardError);
    const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

    const factory = new AIAssistantInsertFactory(
      mockAdapter,
      ['editor.action.clipboardPasteAction'],
      mockLogger,
    );
    const insertFn = factory.forTarget();

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(executeCommandSpy).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'AIAssistantInsertFactory.insert', error: clipboardError },
      'Failed to write to clipboard',
    );
  });
});
