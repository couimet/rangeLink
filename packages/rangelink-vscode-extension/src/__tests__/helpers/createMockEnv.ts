/**
 * Create a mock vscode.env object for testing
 */

import * as vscode from 'vscode';

/**
 * Mock vscode.env object for environment detection tests.
 *
 * Provides complete mock of vscode.env with:
 * - appName and uriScheme for environment detection
 * - clipboard.writeText() for VscodeAdapter clipboard operations
 * - clipboard.readText() for test completeness
 *
 * All clipboard methods return proper Promise types matching VSCode API.
 *
 * @param options - Environment properties to override
 * @returns Mock env object compatible with VscodeAdapter
 */
export const createMockEnv = (options?: {
  appName?: string;
  uriScheme?: string;
}): typeof vscode.env => {
  return {
    appName: options?.appName || 'Visual Studio Code',
    uriScheme: options?.uriScheme || 'vscode',
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
      readText: jest.fn().mockResolvedValue(''),
    },
  } as unknown as typeof vscode.env;
};
