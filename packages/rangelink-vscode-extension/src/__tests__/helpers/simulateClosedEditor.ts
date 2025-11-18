/**
 * Simulate a closed editor by clearing all editors and tab groups
 */

import * as vscode from 'vscode';

/**
 * Simulate a closed editor by clearing all editors and tab groups.
 *
 * Useful for testing scenarios where an editor has been closed:
 * - Empty visibleTextEditors array
 * - Empty tab groups
 *
 * @param mockVscode - The mocked vscode instance (from adapter.__getVscodeInstance())
 */
export const simulateClosedEditor = (mockVscode: any): void => {
  mockVscode.window.visibleTextEditors = [];
  mockVscode.window.tabGroups = {
    all: [],
    activeTabGroup: undefined,
    onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
    close: jest.fn(),
  } as unknown as vscode.TabGroups;
};
