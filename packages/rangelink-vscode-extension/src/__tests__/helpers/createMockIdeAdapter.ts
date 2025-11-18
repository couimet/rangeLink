/**
 * Mock IdeAdapter for testing
 *
 * Provides factory function to create mock IDE adapters with sensible defaults.
 */

import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

/**
 * Options for creating a mock IDE adapter
 */
export interface MockIdeAdapterOptions {
  /** Mock active text editor (default: undefined) */
  activeTextEditor?: vscode.TextEditor;
  /** Mock workspace folder return value (default: { uri: { fsPath: '/workspace' } }) */
  workspaceFolder?: { uri: { fsPath: string } };
  /** Mock relative path return value (default: 'src/file.ts') */
  relativePath?: string;
}

/**
 * Create a mock IdeAdapter for testing
 *
 * Provides common IDE operations with jest mock functions:
 * - Clipboard operations (writeTextToClipboard)
 * - Status bar messages (setStatusBarMessage)
 * - User notifications (showWarningMessage, showErrorMessage, showInformationMessage)
 * - Workspace operations (getWorkspaceFolder, asRelativePath)
 *
 * @param options - Optional configuration for the mock
 * @returns Mock VscodeAdapter with jest functions
 */
export const createMockIdeAdapter = (options: MockIdeAdapterOptions = {}): jest.Mocked<VscodeAdapter> => {
  const {
    activeTextEditor = undefined,
    workspaceFolder = { uri: { fsPath: '/workspace' } },
    relativePath = 'src/file.ts',
  } = options;

  return {
    activeTextEditor,
    writeTextToClipboard: jest.fn().mockResolvedValue(undefined),
    setStatusBarMessage: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    getWorkspaceFolder: jest.fn().mockReturnValue(workspaceFolder),
    asRelativePath: jest.fn().mockReturnValue(relativePath),
  } as unknown as jest.Mocked<VscodeAdapter>;
};
