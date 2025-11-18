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
 * @param options - Optional workspace properties to override (workspaceFolders, event listeners, etc.)
 * @returns Mock workspace with file operations and document handling
 */
export const createMockWorkspace = (options?: Record<string, unknown>) => {
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
    onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
    fs: {
      stat: jest.fn(),
    },
    ...options,
  };
};
