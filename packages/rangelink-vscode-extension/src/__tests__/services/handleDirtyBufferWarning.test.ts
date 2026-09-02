import { handleDirtyBufferWarning } from '../../services/handleDirtyBufferWarning';
import { FILE_PATH_DIRTY_BUFFER_CODES, LINK_DIRTY_BUFFER_CODES } from '../../services/types';
import { createMockConfigReader, createMockDocument, createMockUri, createMockVscodeAdapter, spyOnFormatMessage } from '../helpers';

import { createMockLogger } from '@couimet/logger-contract-testing';

const MOCK_URI = createMockUri('/test/file.ts');

const setupLinkLabels = (formatMessageSpy: jest.SpyInstance) => {
  formatMessageSpy.mockImplementation((code: string) => {
    if (code === 'WARN_LINK_DIRTY_BUFFER') return 'File has unsaved changes. Continue?';
    if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE') return 'Save & Generate';
    if (code === 'WARN_LINK_DIRTY_BUFFER_CONTINUE') return 'Generate Anyway';
    if (code === 'WARN_LINK_DIRTY_BUFFER_SAVE_FAILED') return 'Save failed';
    return `mock:${code}`;
  });
};

describe('handleDirtyBufferWarning', () => {
  const mockLogger = createMockLogger();

  const createDirtyDoc = (saveResult = true) =>
    createMockDocument({
      uri: MOCK_URI,
      isDirty: true,
      save: jest.fn().mockResolvedValue(saveResult),
    });

  const createConfigReader = (action: 'prompt' | 'saveAndContinue' | 'continueAnyway') => {
    const reader = createMockConfigReader();
    reader.getWithDefault.mockReturnValue(action);
    return reader;
  };

  it('returns Clean when document is not dirty', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const configReader = createConfigReader('prompt');
    const cleanDoc = createMockDocument({ uri: MOCK_URI, isDirty: false });

    const result = await handleDirtyBufferWarning(cleanDoc, configReader, mockAdapter, mockLogger, LINK_DIRTY_BUFFER_CODES);

    expect(result).toBe('Clean');
  });

  it('returns ContinueAnyway without dialog when unsavedFile.action=continueAnyway', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const showWarnSpy = jest.spyOn(mockAdapter, 'showWarningMessageWithOptions');
    const configReader = createConfigReader('continueAnyway');

    const result = await handleDirtyBufferWarning(createDirtyDoc(), configReader, mockAdapter, mockLogger, LINK_DIRTY_BUFFER_CODES);

    expect(result).toBe('ContinueAnyway');
    expect(showWarnSpy).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning', documentUri: MOCK_URI.toString() },
      'Document has unsaved changes but unsavedFile.action=continueAnyway bypasses the dialog',
    );
  });

  it('auto-saves and returns SaveAndContinue when unsavedFile.action=saveAndContinue', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const showWarnSpy = jest.spyOn(mockAdapter, 'showWarningMessageWithOptions');
    const mockDoc = createDirtyDoc(true);
    const configReader = createConfigReader('saveAndContinue');

    const result = await handleDirtyBufferWarning(mockDoc, configReader, mockAdapter, mockLogger, LINK_DIRTY_BUFFER_CODES);

    expect(result).toBe('SaveAndContinue');
    expect(mockDoc.save).toHaveBeenCalledTimes(1);
    expect(showWarnSpy).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'handleDirtyBufferWarning', documentUri: MOCK_URI.toString() },
      'Document has unsaved changes, unsavedFile.action=saveAndContinue auto-saving',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'handleDirtyBufferWarning.saveAndContinue' }, 'Document saved successfully');
  });

  it('returns SaveFailed and shows warning when auto-save fails under saveAndContinue', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    setupLinkLabels(formatMessageSpy);
    const mockAdapter = createMockVscodeAdapter();
    const showWarnSpy = jest.spyOn(mockAdapter, 'showWarningMessageWithOptions');
    const showErrorToastSpy = jest.spyOn(mockAdapter, 'showWarningMessage');
    const mockDoc = createDirtyDoc(false);
    const configReader = createConfigReader('saveAndContinue');

    const result = await handleDirtyBufferWarning(mockDoc, configReader, mockAdapter, mockLogger, LINK_DIRTY_BUFFER_CODES);

    expect(result).toBe('SaveFailed');
    expect(mockDoc.save).toHaveBeenCalledTimes(1);
    expect(showWarnSpy).not.toHaveBeenCalled();
    expect(showErrorToastSpy).toHaveBeenCalledWith('Save failed');
    expect(mockLogger.warn).toHaveBeenCalledWith({ fn: 'handleDirtyBufferWarning.saveAndContinue' }, 'Save operation failed or was cancelled');
  });

  it('shows a modal dialog and returns SaveAndContinue when user saves and save succeeds', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    setupLinkLabels(formatMessageSpy);
    const mockAdapter = createMockVscodeAdapter();
    const showWarnSpy = jest.spyOn(mockAdapter, 'showWarningMessageWithOptions').mockResolvedValue('Save & Generate');
    const mockDoc = createDirtyDoc(true);
    const configReader = createConfigReader('prompt');

    const result = await handleDirtyBufferWarning(mockDoc, configReader, mockAdapter, mockLogger, LINK_DIRTY_BUFFER_CODES);

    expect(result).toBe('SaveAndContinue');
    expect(showWarnSpy).toHaveBeenCalledWith('File has unsaved changes. Continue?', { modal: true }, 'Save & Generate', 'Generate Anyway');
    expect(mockDoc.save).toHaveBeenCalledTimes(1);
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'handleDirtyBufferWarning.saveAndContinue' }, 'Document saved successfully');
  });

  it('returns SaveFailed and shows warning when save fails in the modal dialog', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    setupLinkLabels(formatMessageSpy);
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessageWithOptions').mockResolvedValue('Save & Generate');
    const showErrorToastSpy = jest.spyOn(mockAdapter, 'showWarningMessage');
    const mockDoc = createDirtyDoc(false);
    const configReader = createConfigReader('prompt');

    const result = await handleDirtyBufferWarning(mockDoc, configReader, mockAdapter, mockLogger, LINK_DIRTY_BUFFER_CODES);

    expect(result).toBe('SaveFailed');
    expect(showErrorToastSpy).toHaveBeenCalledWith('Save failed');
    expect(mockLogger.warn).toHaveBeenCalledWith({ fn: 'handleDirtyBufferWarning.saveAndContinue' }, 'Save operation failed or was cancelled');
  });

  it('returns ContinueAnyway when user chooses to generate without saving in the modal dialog', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    setupLinkLabels(formatMessageSpy);
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessageWithOptions').mockResolvedValue('Generate Anyway');
    const configReader = createConfigReader('prompt');

    const result = await handleDirtyBufferWarning(createDirtyDoc(), configReader, mockAdapter, mockLogger, LINK_DIRTY_BUFFER_CODES);

    expect(result).toBe('ContinueAnyway');
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'handleDirtyBufferWarning' }, 'User chose to continue without saving');
  });

  it('returns Dismissed when user dismisses the modal dialog', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    setupLinkLabels(formatMessageSpy);
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessageWithOptions').mockResolvedValue(undefined);
    const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');
    const configReader = createConfigReader('prompt');

    const result = await handleDirtyBufferWarning(createDirtyDoc(), configReader, mockAdapter, mockLogger, LINK_DIRTY_BUFFER_CODES);

    expect(result).toBe('Dismissed');
    expect(showInfoSpy).toHaveBeenCalledWith('mock:INFO_OPERATION_ABORTED_DIRTY_BUFFER');
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'handleDirtyBufferWarning' }, 'User dismissed warning, aborting');
  });

  it('uses custom message codes when provided', async () => {
    const formatMessageSpy = spyOnFormatMessage();
    formatMessageSpy.mockImplementation((code: string) => {
      if (code === 'WARN_FILE_PATH_DIRTY_BUFFER_SAVE') return 'Save & Send';
      if (code === 'WARN_FILE_PATH_DIRTY_BUFFER_CONTINUE') return 'Send Anyway';
      return `mock:${code}`;
    });
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessageWithOptions').mockResolvedValue('Save & Send');
    const mockDoc = createDirtyDoc(true);
    const configReader = createConfigReader('prompt');

    const result = await handleDirtyBufferWarning(mockDoc, configReader, mockAdapter, mockLogger, FILE_PATH_DIRTY_BUFFER_CODES);

    expect(result).toBe('SaveAndContinue');
    expect(formatMessageSpy).toHaveBeenCalledWith('WARN_FILE_PATH_DIRTY_BUFFER');
    expect(formatMessageSpy).toHaveBeenCalledWith('WARN_FILE_PATH_DIRTY_BUFFER_SAVE');
    expect(formatMessageSpy).toHaveBeenCalledWith('WARN_FILE_PATH_DIRTY_BUFFER_CONTINUE');
  });
});
