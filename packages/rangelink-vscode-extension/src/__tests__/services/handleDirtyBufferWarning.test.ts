import { createMockLogger } from 'barebone-logger-testing';

import {
  handleDirtyBufferWarning,
  LINK_DIRTY_BUFFER_CODES,
  FILE_PATH_DIRTY_BUFFER_CODES,
} from '../../services/handleDirtyBufferWarning';
import {
  createMockConfigReader,
  createMockDocument,
  createMockUri,
  createMockVscodeAdapter,
  spyOnFormatMessage,
} from '../helpers';

const MOCK_URI = createMockUri('/test/file.ts');

describe('handleDirtyBufferWarning', () => {
  const mockLogger = createMockLogger();

  const createDirtyDoc = (saveResult = true) =>
    createMockDocument({
      uri: MOCK_URI,
      isDirty: true,
      save: jest.fn().mockResolvedValue(saveResult),
    });

  const createConfigReader = (warnOnDirty = true) => {
    const reader = createMockConfigReader();
    reader.getBoolean.mockReturnValue(warnOnDirty);
    return reader;
  };

  it('returns Clean when document is not dirty', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const configReader = createConfigReader();
    const cleanDoc = createMockDocument({ uri: MOCK_URI, isDirty: false });

    const result = await handleDirtyBufferWarning(
      cleanDoc,
      configReader,
      mockAdapter,
      mockLogger,
      LINK_DIRTY_BUFFER_CODES,
    );

    expect(result).toBe('Clean');
  });

  it('returns ContinueAnyway without dialog when setting is disabled', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const showWarnSpy = jest.spyOn(mockAdapter, 'showWarningMessage');
    const configReader = createConfigReader(false);

    const result = await handleDirtyBufferWarning(
      createDirtyDoc(),
      configReader,
      mockAdapter,
      mockLogger,
      LINK_DIRTY_BUFFER_CODES,
    );

    expect(result).toBe('ContinueAnyway');
    expect(showWarnSpy).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning', documentUri: MOCK_URI.toString() },
      'Document has unsaved changes but warning is disabled by setting',
    );
  });

  it('returns SaveAndContinue when user saves and save succeeds', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue('Save & Generate');
    const mockDoc = createDirtyDoc(true);
    const configReader = createConfigReader();
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
      if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(
      mockDoc,
      configReader,
      mockAdapter,
      mockLogger,
      LINK_DIRTY_BUFFER_CODES,
    );

    expect(result).toBe('SaveAndContinue');
    expect(mockDoc.save).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'Document saved successfully',
    );
  });

  it('returns SaveFailed and shows warning when save fails', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue('Save & Generate');
    const mockDoc = createDirtyDoc(false);
    const configReader = createConfigReader();
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
      if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE_FAILED') return 'Save failed';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(
      mockDoc,
      configReader,
      mockAdapter,
      mockLogger,
      LINK_DIRTY_BUFFER_CODES,
    );

    expect(result).toBe('SaveFailed');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'Save operation failed or was cancelled',
    );
  });

  it('returns ContinueAnyway when user chooses to generate without saving', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue('Generate Anyway');
    const configReader = createConfigReader();
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
      if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(
      createDirtyDoc(),
      configReader,
      mockAdapter,
      mockLogger,
      LINK_DIRTY_BUFFER_CODES,
    );

    expect(result).toBe('ContinueAnyway');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'User chose to generate anyway',
    );
  });

  it('returns Dismissed when user dismisses the dialog', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue(undefined);
    const configReader = createConfigReader();
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
      if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(
      createDirtyDoc(),
      configReader,
      mockAdapter,
      mockLogger,
      LINK_DIRTY_BUFFER_CODES,
    );

    expect(result).toBe('Dismissed');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning' },
      'User dismissed warning, aborting',
    );
  });

  it('uses custom message codes when provided', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue('Save & Send');
    const mockDoc = createDirtyDoc(true);
    const configReader = createConfigReader();
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_FILE_PATH_DIRTY_BUFFER_SAVE') return 'Save & Send';
      if (code === 'WARN_FILE_PATH_DIRTY_BUFFER_CONTINUE') return 'Send Anyway';
      return `mock:${code}`;
    });

    const result = await handleDirtyBufferWarning(
      mockDoc,
      configReader,
      mockAdapter,
      mockLogger,
      FILE_PATH_DIRTY_BUFFER_CODES,
    );

    expect(result).toBe('SaveAndContinue');
    expect(formatMessageSpy).toHaveBeenCalledWith('WARN_FILE_PATH_DIRTY_BUFFER');
    expect(formatMessageSpy).toHaveBeenCalledWith('WARN_FILE_PATH_DIRTY_BUFFER_SAVE');
    expect(formatMessageSpy).toHaveBeenCalledWith('WARN_FILE_PATH_DIRTY_BUFFER_CONTINUE');
  });
});
