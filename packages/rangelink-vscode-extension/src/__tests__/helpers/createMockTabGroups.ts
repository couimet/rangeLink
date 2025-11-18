/**
 * Mock TabGroups factory for tab group tests
 */

import * as vscode from 'vscode';

/**
 * Create a mock TabGroups structure with optional overrides.
 *
 * Provides composable tab groups structure for testing. Can be used directly
 * or through convenience helpers like configureEmptyTabGroups().
 *
 * @param overrides - Optional overrides for TabGroups structure
 * @returns Mock TabGroups object
 */
export const createMockTabGroups = (
  overrides: Partial<vscode.TabGroups> = {},
): vscode.TabGroups => {
  return {
    all: [],
    activeTabGroup: undefined,
    onDidChangeTabGroups: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeTabs: jest.fn(() => ({ dispose: jest.fn() })),
    close: jest.fn(),
    ...overrides,
  } as unknown as vscode.TabGroups;
};
