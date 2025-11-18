/**
 * Create a mock workspace folder for testing
 */

import * as vscode from 'vscode';

import { createMockUriInstance } from './createMockUriInstance';

/**
 * Create a mock workspace folder with sensible defaults.
 *
 * Provides a mock vscode.WorkspaceFolder object for testing
 * workspace-relative path resolution.
 *
 * @param fsPath - File system path for the workspace root
 * @param overrides - Optional property overrides (name, index, etc.)
 * @returns Mock workspace folder
 */
export const createMockWorkspaceFolder = (
  fsPath: string,
  overrides?: Partial<vscode.WorkspaceFolder>,
): vscode.WorkspaceFolder => {
  const uri = createMockUriInstance(fsPath);
  return {
    uri,
    name: fsPath.split('/').pop() || 'workspace',
    index: 0,
    ...overrides,
  } as vscode.WorkspaceFolder;
};
