/**
 * Create a mocked getWorkspaceFolder function for testing
 */

import { createMockWorkspaceFolder } from './createMockWorkspaceFolder';

/**
 * Create a mocked getWorkspaceFolder function that returns a workspace folder.
 *
 * Encapsulates the common pattern: `jest.fn().mockReturnValue({ uri: { fsPath: path } })`
 *
 * @param fsPath - File system path for the workspace root (e.g., '/workspace')
 * @returns Jest mock function that returns a WorkspaceFolder
 *
 * @example
 * ```typescript
 * const adapter = createMockVscodeAdapter({
 *   workspaceOptions: {
 *     getWorkspaceFolder: createMockGetWorkspaceFolder('/workspace'),
 *   },
 * });
 * ```
 */
export const createMockGetWorkspaceFolder = (fsPath: string) => {
  return jest.fn().mockReturnValue(createMockWorkspaceFolder(fsPath));
};
