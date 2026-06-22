import { createMockLogger } from '@couimet/logger-contract-testing';
import * as vscode from 'vscode';

import { createMockOperationFeedbackProvider, createMockUri } from '../../__tests__/helpers';
import { createTabCloseGuard } from '../createTabCloseGuard';

describe('createTabCloseGuard', () => {
  let mockEvents: {
    onDidCloseTerminal: jest.Mock;
    onDidCloseTextDocument: jest.Mock;
    onDidChangeTabs: jest.Mock;
  };
  let mockFeedback: ReturnType<typeof createMockOperationFeedbackProvider>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let clearBinding: jest.Mock;
  let testUri: vscode.Uri;

  const createClosedEvent = (uri: vscode.Uri): { closed: { input: { uri: vscode.Uri } }[] } => ({
    closed: [{ input: { uri } }],
  });

  const createGuard = () =>
    createTabCloseGuard({
      boundUri: testUri,
      events: mockEvents,
      feedback: mockFeedback,
      displayName: 'Text Editor ("test.ts")',
      clearBinding,
      logger: mockLogger,
    });

  beforeEach(() => {
    mockEvents = {
      onDidCloseTerminal: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidCloseTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidChangeTabs: jest.fn().mockReturnValue({ dispose: jest.fn() }),
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
    expect(mockFeedback.notifyAutoUnbind).toHaveBeenCalledWith(
      'Text Editor ("test.ts")',
      'editor-closed',
    );
  });

  it('does not unbind when another tab of the same file is still open', () => {
    (vscode.window.tabGroups as unknown as { all: unknown[] }).all = [
      { tabs: [{ input: { uri: testUri } }] },
    ];

    createGuard();

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(testUri));

    expect(clearBinding).not.toHaveBeenCalled();
    expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
  });

  it('does nothing when a different tab is closed', () => {
    createGuard();

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(createMockUri('/other.ts')));

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
