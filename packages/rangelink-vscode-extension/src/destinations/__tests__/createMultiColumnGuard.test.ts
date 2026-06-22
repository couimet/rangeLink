import { createMockLogger } from '@couimet/logger-contract-testing';
import type * as vscode from 'vscode';

import { createMockOperationFeedbackProvider, createMockUri } from '../../__tests__/helpers';
import { createMultiColumnGuard } from '../createMultiColumnGuard';

describe('createMultiColumnGuard', () => {
  let mockEvents: {
    onDidCloseTerminal: jest.Mock;
    onDidCloseTextDocument: jest.Mock;
    onDidChangeTabs: jest.Mock;
  };
  let mockEditors: { findVisibleEditorsByUri: jest.Mock };
  let mockFeedback: ReturnType<typeof createMockOperationFeedbackProvider>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let testUri: vscode.Uri;

  beforeEach(() => {
    mockEvents = {
      onDidCloseTerminal: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidCloseTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onDidChangeTabs: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    };
    mockEditors = { findVisibleEditorsByUri: jest.fn().mockReturnValue([]) };
    mockFeedback = createMockOperationFeedbackProvider();
    mockLogger = createMockLogger();
    testUri = createMockUri('/test.ts');
  });

  const createGuard = () =>
    createMultiColumnGuard({
      boundUri: testUri,
      events: mockEvents,
      editors: mockEditors,
      feedback: mockFeedback,
      logger: mockLogger,
    });

  it('warns when bound editor appears in 2+ tab groups', () => {
    createGuard();
    mockEditors.findVisibleEditorsByUri.mockReturnValue([{ viewColumn: 1 }, { viewColumn: 2 }]);

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      {
        fn: 'createMultiColumnGuard',
        editorUri: 'file:///test.ts',
        matchCount: 2,
        viewColumns: [1, 2],
      },
      'Bound file detected in multiple editor groups',
    );
    expect(mockFeedback.notifyDuplicateTabWarning).toHaveBeenCalledTimes(1);
  });

  it('does not re-warn when already in duplicate state', () => {
    createGuard();
    mockEditors.findVisibleEditorsByUri.mockReturnValue([{ viewColumn: 1 }, { viewColumn: 2 }]);

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler();
    mockFeedback.notifyDuplicateTabWarning.mockClear();
    handler();

    expect(mockFeedback.notifyDuplicateTabWarning).not.toHaveBeenCalled();
  });

  it('clears duplicate state when back to 0 instances', () => {
    createGuard();
    mockEditors.findVisibleEditorsByUri.mockReturnValue([{ viewColumn: 1 }, { viewColumn: 2 }]);

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler();
    mockEditors.findVisibleEditorsByUri.mockReturnValue([]);
    (mockLogger.info as jest.Mock).mockClear();
    handler();

    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'createMultiColumnGuard', editorUri: 'file:///test.ts' },
      'Bound file no longer in multiple editor groups — duplicate state cleared',
    );
  });

  it('clears duplicate state when back to 1 instance', () => {
    createGuard();
    mockEditors.findVisibleEditorsByUri.mockReturnValue([{ viewColumn: 1 }, { viewColumn: 2 }]);

    const handler = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler();
    mockEditors.findVisibleEditorsByUri.mockReturnValue([{ viewColumn: 1 }]);
    handler();
    mockEditors.findVisibleEditorsByUri.mockReturnValue([{ viewColumn: 1 }, { viewColumn: 2 }]);
    mockFeedback.notifyDuplicateTabWarning.mockClear();
    handler();

    expect(mockFeedback.notifyDuplicateTabWarning).toHaveBeenCalledTimes(1);
  });

  it('resets duplicate state when re-created (new binding)', () => {
    const guard1 = createGuard();
    mockEditors.findVisibleEditorsByUri.mockReturnValue([{ viewColumn: 1 }, { viewColumn: 2 }]);

    const handler1 = mockEvents.onDidChangeTabs.mock.calls[0][0];
    handler1();
    expect(mockFeedback.notifyDuplicateTabWarning).toHaveBeenCalledTimes(1);

    guard1.dispose();

    const guard2 = createGuard();
    mockFeedback.notifyDuplicateTabWarning.mockClear();

    const handler2 = mockEvents.onDidChangeTabs.mock.calls[1][0];
    handler2();

    expect(mockFeedback.notifyDuplicateTabWarning).toHaveBeenCalledTimes(1);

    guard2.dispose();
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
