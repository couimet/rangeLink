/**
 * Mock TabGroup factory for tab group tests
 */

import * as vscode from 'vscode';

/**
 * Create a mock TabGroup for tab group tests.
 *
 * Provides minimal TabGroup structure for testing tab operations.
 * By default, creates a group with a single tab that is also the active tab.
 *
 * @param tabs - Array of tabs in the group (defaults to empty array)
 * @param overrides - Optional property overrides (e.g., activeTab)
 * @returns Mock TabGroup instance
 */
export const createMockTabGroup = (
  tabs: vscode.Tab[] = [],
  overrides?: Partial<vscode.TabGroup>,
): vscode.TabGroup => {
  return {
    tabs,
    activeTab: tabs[0], // First tab is active by default
    ...overrides,
  } as unknown as vscode.TabGroup;
};
