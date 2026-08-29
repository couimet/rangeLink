import { AIAssistantInsertFactory } from '../../../../destinations/capabilities/insertFactories/aiAssistantInsertFactory';
import { RangeLinkExtensionError } from '../../../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../../../errors/RangeLinkExtensionErrorCodes';
import { ExtensionResult } from '../../../../types/ExtensionResult';
import { createMockClipboardService, createMockVscodeAdapter } from '../../../helpers';

import { getUniqueString } from '@couimet/dynamic-testing';
import { createMockLogger } from '@couimet/logger-contract-testing';

describe('AIAssistantInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('stages the content through ClipboardService, pastes, and reports success', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const mockClipboardService = createMockClipboardService();
    const content = getUniqueString();
    const pasteSpy = jest.spyOn(mockAdapter, 'pasteClipboardToAiAssistant').mockResolvedValue(true);

    const factory = new AIAssistantInsertFactory(mockAdapter, mockClipboardService, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(content);

    expect(result).toBe(true);
    expect(mockClipboardService.stage).toHaveBeenCalledWith(content, expect.any(Function));
    expect(pasteSpy).toHaveBeenCalledWith();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('returns false and warns when the paste command fails', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const mockClipboardService = createMockClipboardService();
    jest.spyOn(mockAdapter, 'pasteClipboardToAiAssistant').mockResolvedValue(false);

    const factory = new AIAssistantInsertFactory(mockAdapter, mockClipboardService, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(mockClipboardService.stage).toHaveBeenCalledWith('content', expect.any(Function));
    expect(mockAdapter.pasteClipboardToAiAssistant).toHaveBeenCalledWith();
    expect(mockLogger.warn).toHaveBeenCalledWith({ fn: 'AIAssistantInsertFactory.insert', allCommandsFailed: true }, 'Clipboard paste command failed');
  });

  it('returns false and warns with the error when the clipboard pipeline fails', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const mockClipboardService = createMockClipboardService();
    const stageError = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.CLIPBOARD_READ_FAILED,
      message: 'Failed to read clipboard',
      functionName: 'ClipboardService::stage',
    });
    mockClipboardService.stage.mockResolvedValue(ExtensionResult.err(stageError));
    const pasteSpy = jest.spyOn(mockAdapter, 'pasteClipboardToAiAssistant').mockResolvedValue(false);

    const factory = new AIAssistantInsertFactory(mockAdapter, mockClipboardService, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(pasteSpy).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith({ fn: 'AIAssistantInsertFactory.insert', error: stageError }, 'Clipboard paste command failed');
  });
});
