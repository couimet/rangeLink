import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

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

  const createClosedEvent = (uri: vscode.Uri): { closed: { input: { uri: vscode.Uri } }[] } => ({
    closed: [{ input: { uri } }],
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
  });

  it('unbinds when the bound editor tab is closed', () => {
    const uri = createMockUri('/test.ts');
    createTabCloseGuard({
      events: mockEvents,
      feedback: mockFeedback,
      logger: mockLogger,
      boundUri: uri,
      displayName: 'Text Editor ("test.ts")',
      clearBinding,
    });

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(uri));

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

  it('does nothing when a different tab is closed', () => {
    createTabCloseGuard({
      events: mockEvents,
      feedback: mockFeedback,
      logger: mockLogger,
      boundUri: createMockUri('/bound.ts'),
      displayName: 'Text Editor ("bound.ts")',
      clearBinding,
    });

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler(createClosedEvent(createMockUri('/other.ts')));

    expect(clearBinding).not.toHaveBeenCalled();
    expect(mockFeedback.notifyAutoUnbind).not.toHaveBeenCalled();
  });

  it('subscribes to onDidChangeTabs', () => {
    createTabCloseGuard({
      events: mockEvents,
      feedback: mockFeedback,
      logger: mockLogger,
      boundUri: createMockUri('/test.ts'),
      displayName: 'Text Editor ("test.ts")',
      clearBinding,
    });

    expect(mockEvents.onDidChangeTabs).toHaveBeenCalledTimes(1);
  });

  it('returns a disposable that unsubscribes', () => {
    const dispose = jest.fn();
    mockEvents.onDidChangeTabs.mockReturnValue({ dispose });

    const guard = createTabCloseGuard({
      events: mockEvents,
      feedback: mockFeedback,
      logger: mockLogger,
      boundUri: createMockUri('/test.ts'),
      displayName: 'Text Editor ("test.ts")',
      clearBinding,
    });

    guard.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
