import { createMockLogger } from '@couimet/logger-contract-testing';
import * as vscode from 'vscode';

import { createMockOperationFeedbackProvider, createMockUri } from '../../__tests__/helpers';
import { createFileDeleteWatcher } from '../createFileDeleteWatcher';

describe('createFileDeleteWatcher', () => {
  let mockWatcherFactory: { createFileSystemWatcherForFile: jest.Mock };
  let mockFeedback: ReturnType<typeof createMockOperationFeedbackProvider>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let clearBinding: jest.Mock;
  let testUri: vscode.Uri;
  let mockWatcher: { onDidDelete: jest.Mock; dispose: jest.Mock };

  const createGuard = () =>
    createFileDeleteWatcher({
      boundUri: testUri,
      watcherFactory: mockWatcherFactory,
      feedback: mockFeedback,
      displayName: 'Text Editor ("test.ts")',
      clearBinding,
      logger: mockLogger,
    });

  beforeEach(() => {
    mockWatcher = {
      onDidDelete: jest.fn(),
      dispose: jest.fn(),
    };
    mockWatcherFactory = {
      createFileSystemWatcherForFile: jest.fn().mockReturnValue(mockWatcher),
    };
    mockFeedback = createMockOperationFeedbackProvider();
    mockLogger = createMockLogger();
    clearBinding = jest.fn();
    testUri = createMockUri('/test.ts');
  });

  it('creates a FileSystemWatcher scoped to the bound file with only delete events enabled', () => {
    createGuard();

    expect(mockWatcherFactory.createFileSystemWatcherForFile).toHaveBeenCalledWith(
      testUri,
      true,
      true,
      false,
    );
  });

  it('subscribes to onDidDelete on the watcher', () => {
    createGuard();

    expect(mockWatcher.onDidDelete).toHaveBeenCalledTimes(1);
  });

  it('unbinds and notifies when the bound file is deleted', () => {
    createGuard();

    const handler = mockWatcher.onDidDelete.mock.calls[0][0];
    handler(testUri);

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'createFileDeleteWatcher', fileUri: 'file:///test.ts' },
      'Bound file deleted from disk: Text Editor ("test.ts") — auto-unbinding',
    );
    expect(clearBinding).toHaveBeenCalledTimes(1);
    expect(mockFeedback.notifyAutoUnbind).toHaveBeenCalledWith(
      'Text Editor ("test.ts")',
      'file-deleted',
    );
  });

  it('does nothing when a different file is deleted', () => {
    createGuard();

    const handler = mockWatcher.onDidDelete.mock.calls[0][0];
    handler(createMockUri('/other.ts'));

    expect(clearBinding).not.toHaveBeenCalled();
    expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
  });

  it('does nothing when nothing is bound (clearBinding is a no-op at construction)', () => {
    clearBinding.mockImplementation(() => {});
    const guard = createGuard();

    const handler = mockWatcher.onDidDelete.mock.calls[0][0];
    handler(testUri);

    expect(clearBinding).toHaveBeenCalledTimes(1);
    expect(mockFeedback.notifyAutoUnbind).toHaveBeenCalledWith(
      'Text Editor ("test.ts")',
      'file-deleted',
    );

    guard.dispose();
  });

  it('returns the watcher as the disposable', () => {
    const guard = createGuard();

    guard.dispose();

    expect(mockWatcher.dispose).toHaveBeenCalledTimes(1);
  });
});
