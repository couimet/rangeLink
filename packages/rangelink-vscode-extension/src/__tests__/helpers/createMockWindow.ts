/**
 * Create a mock vscode.window object for testing
 */

import * as vscode from 'vscode';

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
 * **Flexible options:** Accepts either property overrides (Record) or a pre-built window object (Partial<vscode.Window>).
 * If a pre-built object with `setStatusBarMessage` is provided, it's used directly (avoiding unnecessary mock creation).
 *
 * @param options - Optional property overrides or pre-built window object
 * @returns Mock window object
 */
export const createMockWindow = (
  options?: Record<string, unknown> | Partial<typeof vscode.window>,
) => {
  // Simple check: if it has setStatusBarMessage, treat it as a pre-built window object
  if (options && 'setStatusBarMessage' in options) {
    return options;
  }

  // Otherwise, create default mock and spread options as overrides
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
    createStatusBarItem: jest.fn(),
    createOutputChannel: jest.fn(),
    setStatusBarMessage: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showQuickPick: jest.fn().mockResolvedValue(undefined),
    showTextDocument: jest.fn().mockResolvedValue(undefined),
    onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
    ...options,
  };
};
