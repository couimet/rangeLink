/**
 * Create a mock workspace object for testing
 */

import * as vscode from 'vscode';

import { createMockWorkspaceFolder } from './createMockWorkspaceFolder';

/**
 * Create a mock workspace object for navigation tests.
 *
 * Accepts either string paths (for convenience) or full WorkspaceFolder objects.
 * String paths are automatically converted to WorkspaceFolder objects.
 *
 * **Always creates default mocks and spreads options as overrides** - no clever detection.
 * This predictable pattern allows partial overrides while preserving defaults:
 * ```typescript
 * createMockWorkspace({ openTextDocument: myMock })  // Gets defaults for fs, workspaceFolders, etc.
 * ```
 *
 * @param options - Optional workspace properties to override defaults
 * @returns Mock workspace with file operations and document handling
 */
export const createMockWorkspace = (
  options?: Record<string, unknown> | Partial<typeof vscode.workspace>,
) => {
  const defaultWorkspaceFolders = ['/workspace'];
  const workspaceFoldersInput =
    (options?.workspaceFolders as Array<string | vscode.WorkspaceFolder> | undefined) ??
    defaultWorkspaceFolders;

  const folders = workspaceFoldersInput?.map((folder) =>
    typeof folder === 'string' ? createMockWorkspaceFolder(folder) : folder,
  );

  return {
    workspaceFolders: folders,
    openTextDocument: jest.fn(),
    getWorkspaceFolder: jest.fn(),
    asRelativePath: jest.fn(),
    getConfiguration: jest.fn(),
    onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
    fs: {
      stat: jest.fn(),
    },
    ...options,
  };
};
