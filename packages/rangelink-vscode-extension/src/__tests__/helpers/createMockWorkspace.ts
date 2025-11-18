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
 * **Flexible options:** Accepts either property overrides (Record) or a pre-built workspace object (Partial<vscode.Workspace>).
 * If a pre-built object with `openTextDocument` is provided, it's used directly (avoiding unnecessary mock creation).
 *
 * @param options - Optional workspace properties to override or pre-built workspace object
 * @returns Mock workspace with file operations and document handling
 */
export const createMockWorkspace = (
  options?: Record<string, unknown> | Partial<typeof vscode.workspace>,
) => {
  // Simple check: if it has openTextDocument, treat it as a pre-built workspace object
  if (options && 'openTextDocument' in options) {
    return options;
  }

  // Otherwise, create default mock and spread options as overrides
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
