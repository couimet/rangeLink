/**
 * Configure workspace mocks for typical file editor tests
 */

import * as vscode from 'vscode';

import { createMockTabGroups } from './createMockTabGroups';

/**
 * Configure workspace mocks for typical file editor tests.
 *
 * Sets up common workspace API mocks including:
 * - getWorkspaceFolder: Returns mock workspace folder for given document
 * - asRelativePath: Returns relative path for display
 * - openTextDocument: Returns document with URI
 * - visibleTextEditors: Empty array by default
 * - tabGroups: Empty tab groups structure
 *
 * This centralizes the repetitive workspace mock configuration found in many tests.
 *
 * @param mockVscode - The mocked vscode instance (from adapter.__getVscodeInstance())
 * @param options - Configuration options
 * @param options.workspacePath - Workspace root path (default: '/workspace')
 * @param options.relativePath - Relative path for document (default: 'src/file.ts')
 * @param options.visibleEditors - Array of visible editors (default: [])
 */
export const configureWorkspaceMocks = (
  mockVscode: any,
  options: {
    workspacePath?: string;
    relativePath?: string;
    visibleEditors?: vscode.TextEditor[];
  } = {},
): void => {
  const {
    workspacePath = '/workspace',
    relativePath = 'src/file.ts',
    visibleEditors = [],
  } = options;

  // Mock workspace folder lookup
  (mockVscode.workspace.getWorkspaceFolder as jest.Mock) = jest.fn().mockReturnValue({
    uri: { fsPath: workspacePath },
  });

  // Mock relative path conversion
  (mockVscode.workspace.asRelativePath as jest.Mock) = jest.fn().mockReturnValue(relativePath);

  // Mock document opening
  (mockVscode.workspace.openTextDocument as jest.Mock) = jest
    .fn()
    .mockImplementation((uri: vscode.Uri) => Promise.resolve({ uri }));

  // Set visible editors
  mockVscode.window.visibleTextEditors = visibleEditors;

  // Initialize empty tab groups structure
  mockVscode.window.tabGroups = createMockTabGroups();
};
