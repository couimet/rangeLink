import { createMockLogger } from 'barebone-logger-testing';

import { AIAssistantInsertFactory } from '../../../../destinations/capabilities/insertFactories/aiAssistantInsertFactory';
import { createMockVscodeAdapter } from '../../../helpers';

describe('AIAssistantInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('delegates to ideAdapter.pasteTextFromClipboard and returns true on success', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const pasteSpy = jest.spyOn(mockAdapter, 'pasteTextFromClipboard').mockResolvedValue(true);

    const factory = new AIAssistantInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn('test content');

    expect(result).toBe(true);
    expect(pasteSpy).toHaveBeenCalled();
  });

  it('returns false when pasteTextFromClipboard returns false', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'pasteTextFromClipboard').mockResolvedValue(false);

    const factory = new AIAssistantInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'AIAssistantInsertFactory.insert', allCommandsFailed: true },
      'Clipboard paste command failed',
    );
  });
});
