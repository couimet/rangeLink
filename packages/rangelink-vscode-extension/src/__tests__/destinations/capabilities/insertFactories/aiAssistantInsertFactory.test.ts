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
  });

  it('logs debug message when text is copied to clipboard', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const factory = new AIAssistantInsertFactory(
      mockAdapter,
      ['editor.action.clipboardPasteAction'],
      mockLogger,
    );
    const insertFn = factory.forTarget();

    const resultPromise = insertFn('test content');
    await jest.advanceTimersByTimeAsync(FOCUS_TO_PASTE_DELAY_MS);
    await resultPromise;

    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'AIAssistantInsertFactory.insert', textLength: 12 },
      'Copied text to clipboard',
    );
  });

  it('logs info message on successful paste', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const factory = new AIAssistantInsertFactory(
      mockAdapter,
      ['editor.action.clipboardPasteAction'],
      mockLogger,
    );
    const insertFn = factory.forTarget();

    const resultPromise = insertFn('content');
    await jest.advanceTimersByTimeAsync(FOCUS_TO_PASTE_DELAY_MS);
    await resultPromise;

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'AIAssistantInsertFactory.insert', command: 'editor.action.clipboardPasteAction' },
      'Clipboard paste succeeded',
    );
  });

  it('logs info message when all commands fail', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
    jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Failed'));

    const factory = new AIAssistantInsertFactory(mockAdapter, ['command.only'], mockLogger);
    const insertFn = factory.forTarget();

    const resultPromise = insertFn('content');
    await jest.advanceTimersByTimeAsync(FOCUS_TO_PASTE_DELAY_MS);
    await resultPromise;

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'AIAssistantInsertFactory.insert', allCommandsFailed: true },
      'All clipboard paste commands failed',
    );
  });

  it('does not need a runtime target (void parameter)', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

    const factory = new AIAssistantInsertFactory(
      mockAdapter,
      ['editor.action.clipboardPasteAction'],
      mockLogger,
    );

    const insertFn = factory.forTarget();

    const resultPromise = insertFn('content');
    await jest.advanceTimersByTimeAsync(FOCUS_TO_PASTE_DELAY_MS);
    const result = await resultPromise;

    expect(result).toBe(true);
  });
});
