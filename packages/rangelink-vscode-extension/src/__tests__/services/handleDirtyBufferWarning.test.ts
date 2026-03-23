import { createMockLogger } from 'barebone-logger-testing';

import { handleDirtyBufferWarning } from '../../services/handleDirtyBufferWarning';
import {
  createMockDocument,
  createMockUri,
  createMockVscodeAdapter,
  spyOnFormatMessage,
} from '../helpers';

const MOCK_URI = createMockUri('/test/file.ts');

describe('handleDirtyBufferWarning', () => {
  const mockLogger = createMockLogger();

  it('returns SaveAndGenerate when user saves and save succeeds', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    const showWarnSpy = jest
      .spyOn(mockAdapter, 'showWarningMessage')
      .mockResolvedValue('Save & Generate');
    const mockDoc = createMockDocument({
      uri: MOCK_URI,
      save: jest.fn().mockResolvedValue(true),
    });
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
      if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(mockDoc, mockAdapter, mockLogger);

    expect(result).toBe('SaveAndGenerate');
    expect(mockDoc.save).toHaveBeenCalledTimes(1);
    expect(showWarnSpy).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning', documentUri: MOCK_URI.toString() },
      'Document has unsaved changes, showing warning',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'User chose to save and generate',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'Document saved successfully',
    );
  });

  it('returns SaveFailed and shows warning when save fails', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    const showWarnSpy = jest
      .spyOn(mockAdapter, 'showWarningMessage')
      .mockResolvedValue('Save & Generate');
    const mockDoc = createMockDocument({
      uri: MOCK_URI,
      save: jest.fn().mockResolvedValue(false),
    });
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
      if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE_FAILED') return 'Save failed';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(mockDoc, mockAdapter, mockLogger);

    expect(result).toBe('SaveFailed');
    expect(mockDoc.save).toHaveBeenCalledTimes(1);
    expect(showWarnSpy).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'Save operation failed or was cancelled',
    );
  });

  it('returns GenerateAnyway when user chooses to generate without saving', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue('Generate Anyway');
    const mockDoc = createMockDocument({ uri: MOCK_URI });
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
      if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(mockDoc, mockAdapter, mockLogger);

    expect(result).toBe('GenerateAnyway');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'User chose to generate anyway',
    );
  });

  it('returns Dismissed when user dismisses the dialog', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue(undefined);
    const mockDoc = createMockDocument({ uri: MOCK_URI });
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
      if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(mockDoc, mockAdapter, mockLogger);

    expect(result).toBe('Dismissed');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'User dismissed warning, aborting',
    );
  });
});
