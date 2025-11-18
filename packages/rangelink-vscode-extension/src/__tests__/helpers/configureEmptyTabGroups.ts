/**
 * Configure empty tab groups for testing
 */

import { createMockTabGroup } from './createMockTabGroup';
import { createMockTabGroups } from './createMockTabGroups';

/**
 * Configure empty tab groups for testing
 *
 * Common pattern for testing text editor binding which requires 2+ tab groups (split editor).
 * Creates N empty tab groups with no tabs and no active tab.
 *
 * Replaces manual pattern:
 * `(mockWindow.tabGroups as { all: vscode.TabGroup[] }).all = [{}, {}] as vscode.TabGroup[];`
 *
 * @param mockWindow - The mocked window object (from mockVscode.window or mockAdapter.__getVscodeInstance().window)
 * @param count - Number of empty tab groups to create (default: 2)
 */
export const configureEmptyTabGroups = (mockWindow: any, count = 2): void => {
  const emptyGroups = Array.from({ length: count }, () =>
    createMockTabGroup([], { activeTab: undefined }),
  );
  mockWindow.tabGroups = createMockTabGroups({ all: emptyGroups });
};
