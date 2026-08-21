import { createMockOperationFeedbackProvider, createMockUri } from '../../__tests__/helpers';
import { createTabCloseGuard } from '../createTabCloseGuard';

import { createMockLogger } from '@couimet/logger-contract-testing';
import * as vscode from 'vscode';

describe('createTabCloseGuard', () => {
  let mockEvents: {
    onDidCloseTerminal: jest.Mock;
    onDidCloseTextDocument: jest.Mock;
    onDidChangeTabs: jest.Mock;
    onDidRenameFiles: jest.Mock;
  };
  let mockFeedback: ReturnType<typeof createMockOperationFeedbackProvider>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let clearBinding: jest.Mock;
  let testUri: vscode.Uri;

  const createClosedEvent = (uri: vscode.Uri): { closed: { input: { uri: vscode.Uri } }[] } => ({
    closed: [{ input: { uri } }],
  });

  const createGuard = (fileExists?: (uri: vscode.Uri) => boolean) =>
    createTabCloseGuard({
      boundUri: testUri,
      events: mockEvents,
      feedback: mockFeedback,
      displayName: 'Text Editor ("test.ts")',
      clearBinding,
      fileExists: fileExists ?? (() => true),
      logger: mockLogger,
    });

  beforeEach(() => {
    mockEvents = {
      onDidCloseTerminal: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidCloseTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidChangeTabs: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidRenameFiles: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    };
    mockFeedback = createMockOperationFeedbackProvider();
    mockLogger = createMockLogger();
    clearBinding = jest.fn();
    testUri = createMockUri('/test.ts');
    (vscode.window.tabGroups as unknown as { all: unknown[] }).all = [];
  });

  it('unbinds when the last tab of the bound editor is closed', () => {
    createGuard();

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(testUri));

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'createTabCloseGuard', editorUri: 'file:///test.ts' },
      'Bound editor tab closed: Text Editor ("test.ts") — auto-unbinding',
    );
    expect(clearBinding).toHaveBeenCalledTimes(1);
    expect(mockFeedback.notifyAutoUnbind).toHaveBeenCalledWith('Text Editor ("test.ts")', { reason: 'editor-closed' });
  });

  it('does not unbind when another tab of the same file is still open', () => {
    (vscode.window.tabGroups as unknown as { all: unknown[] }).all = [{ tabs: [{ input: { uri: testUri } }] }];

    createGuard();

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(testUri));

    expect(clearBinding).not.toHaveBeenCalled();
    expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
  });

  it('does not unbind when the tab was replaced by a rename (bound file gone from disk)', () => {
    createGuard(() => false);

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(testUri));

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'createTabCloseGuard', editorUri: 'file:///test.ts' },
      'Bound editor tab closed while file no longer exists — deferring to rename/delete listeners for Text Editor ("test.ts")',
    );
    expect(clearBinding).not.toHaveBeenCalled();
    expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
  });

  it('unbinds when the bound file is on disk but the last tab is closed', () => {
    createGuard(() => true);

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(testUri));

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'createTabCloseGuard', editorUri: 'file:///test.ts' },
      'Bound editor tab closed: Text Editor ("test.ts") — auto-unbinding',
    );
    expect(clearBinding).toHaveBeenCalledTimes(1);
    expect(mockFeedback.notifyAutoUnbind).toHaveBeenCalledWith('Text Editor ("test.ts")', { reason: 'editor-closed' });
  });

  it('does nothing when a different tab is closed', () => {
    createGuard();

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(createMockUri('/other.ts')));

    expect(clearBinding).not.toHaveBeenCalled();
    expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
  });

  it('falls back to fs.existsSync when no fileExists function is injected (missing file defers to rename/delete listeners)', () => {
    const missingUri = createMockUri('/__rangelink_missing__/file.ts');
    createTabCloseGuard({
      boundUri: missingUri,
      events: mockEvents,
      feedback: mockFeedback,
      displayName: 'Text Editor ("file.ts")',
      clearBinding,
      logger: mockLogger,
    });

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(missingUri));

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'createTabCloseGuard', editorUri: 'file:///__rangelink_missing__/file.ts' },
      'Bound editor tab closed while file no longer exists — deferring to rename/delete listeners for Text Editor ("file.ts")',
    );
    expect(clearBinding).not.toHaveBeenCalled();
    expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
  });

  it('subscribes to onDidChangeTabs', () => {
    createGuard();
    expect(mockEvents.onDidChangeTabs).toHaveBeenCalledTimes(1);
  });

  it('returns a disposable that unsubscribes', () => {
    const dispose = jest.fn();
    mockEvents.onDidChangeTabs.mockReturnValue({ dispose });

    const guard = createGuard();
    guard.dispose();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
