/**
 * Create a mock CancellationToken for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock CancellationToken for provider tests.
 *
 * @param isCancelled - Whether the token should report as cancelled (default: false)
 * @returns Mock CancellationToken
 */
export const createMockCancellationToken = (isCancelled = false): vscode.CancellationToken => {
  return {
    isCancellationRequested: isCancelled,
    onCancellationRequested: jest.fn(),
  } as unknown as vscode.CancellationToken;
};
