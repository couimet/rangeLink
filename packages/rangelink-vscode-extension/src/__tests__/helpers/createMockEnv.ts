/**
 * Create a mock vscode.env object for testing
 */

import * as vscode from 'vscode';

import { createMockClipboard, type MockClipboard } from './createMockClipboard';

/**
 * Options for creating mock vscode.env
 */
export interface MockEnvOptions {
  appName?: string;
  uriScheme?: string;
  clipboard?: MockClipboard;
}

/**
 * Mock vscode.env object for environment detection tests.
 *
 * Provides complete mock of vscode.env with:
 * - appName and uriScheme for environment detection
 * - clipboard via createMockClipboard() for consistent clipboard mocking
 *
 * @param options - Environment properties to override
 * @returns Mock env object compatible with VscodeAdapter
 */
export const createMockEnv = (options?: MockEnvOptions): typeof vscode.env => {
  return {
    appName: options?.appName || 'Visual Studio Code',
    uriScheme: options?.uriScheme || 'vscode',
    clipboard: options?.clipboard ?? createMockClipboard(),
  } as unknown as typeof vscode.env;
};
