/**
 * Create a mock vscode.window object for testing
 */

import * as vscode from 'vscode';

import { createMockQuickPick } from './createMockQuickPick';
import { createMockStatusBarItem } from './createMockStatusBarItem';

/**
 * Mock vscode.window object for testing.
 *
 * Provides complete mock of vscode.window with:
 * - Status bar operations with Disposable return
 * - Notification methods (info, warning, error)
 * - Document/editor operations
 * - Terminal and editor references
 *
 * All notification methods return Promise<string | undefined> matching VSCode API.
 * setStatusBarMessage returns mock Disposable with dispose() method.
 *
 * **Always creates default mocks and spreads options as overrides** - no clever detection.
 * This predictable pattern allows partial overrides while preserving defaults:
 * ```typescript
 * createMockWindow({ showTextDocument: myMock })  // Gets defaults for other methods
 * ```
 *
 * @param options - Optional property overrides
 * @returns Mock window object
 */
export const createMockWindow = (
  options?: Record<string, unknown> | Partial<typeof vscode.window>,
) => {
  return {
    activeTerminal: undefined as vscode.Terminal | undefined,
    activeTextEditor: undefined as vscode.TextEditor | undefined,
    visibleTextEditors: [] as vscode.TextEditor[],
    tabGroups: {
      all: [],
      activeTabGroup: undefined,
      onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
      close: jest.fn(),
    } as unknown as vscode.TabGroups,
    createStatusBarItem: jest.fn(() => createMockStatusBarItem()),
    createOutputChannel: jest.fn(),
    setStatusBarMessage: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showQuickPick: jest.fn().mockResolvedValue(undefined),
    showInputBox: jest.fn().mockResolvedValue(undefined),
    createQuickPick: jest.fn(() => createMockQuickPick()),
    showTextDocument: jest.fn().mockResolvedValue(undefined),
    onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
    registerTerminalLinkProvider: jest.fn(() => ({ dispose: jest.fn() })),
    ...options,
  };
};
