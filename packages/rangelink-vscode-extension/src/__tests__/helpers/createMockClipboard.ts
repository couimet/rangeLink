/**
 * Create a mock vscode.Clipboard for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock Clipboard for testing.
 *
 * @returns Mock Clipboard with writeText method
 */
export const createMockClipboard = () => {
  return {
    writeText: jest.fn().mockResolvedValue(undefined),
  };
};
