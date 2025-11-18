/**
 * Create a mock URI instance for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock URI instance with sensible defaults.
 *
 * Provides a mock vscode.Uri object with file:// scheme by default.
 * Use this for creating workspace folder URIs, file URIs in tests, etc.
 *
 * @param fsPath - File system path for the URI
 * @param overrides - Optional property overrides (scheme, path, etc.)
 * @returns Mock URI instance
 */
export const createMockUriInstance = (
  fsPath: string,
  overrides?: Partial<vscode.Uri>,
): vscode.Uri => {
  return {
    fsPath,
    scheme: 'file',
    path: fsPath,
    toString: () => `file://${fsPath}`,
    ...overrides,
  } as vscode.Uri;
};
