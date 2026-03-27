import { createMockLogger } from 'barebone-logger-testing';

import { ManualPasteInsertFactory } from '../../../../destinations/capabilities/insertFactories/manualPasteInsertFactory';
import { createMockVscodeAdapter } from '../../../helpers';

const LINK_TEXT = 'src/app.ts#L10-L20';

describe('ManualPasteInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('writes text to clipboard and returns true', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const clipboardSpy = jest
      .spyOn(mockAdapter, 'writeTextToClipboard')
      .mockResolvedValue(undefined);

    const factory = new ManualPasteInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(true);
    expect(clipboardSpy).toHaveBeenCalledWith('src/app.ts#L10-L20');
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'ManualPasteInsertFactory.insert', textLength: 18 },
      'Link copied to clipboard for manual paste',
    );
  });

  it('does not execute any paste commands', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
    const executeCommandSpy = jest.spyOn(mockAdapter, 'executeCommand');

    const factory = new ManualPasteInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget();

    await insertFn(LINK_TEXT);

    expect(executeCommandSpy).not.toHaveBeenCalled();
  });

  it('returns false when clipboard write fails', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const clipboardError = new Error('Clipboard access denied');
    jest.spyOn(mockAdapter, 'writeTextToClipboard').mockRejectedValue(clipboardError);

    const factory = new ManualPasteInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'ManualPasteInsertFactory.insert', error: clipboardError },
      'Failed to write to clipboard',
    );
  });
});
