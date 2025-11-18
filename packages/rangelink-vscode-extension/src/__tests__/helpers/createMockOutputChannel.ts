/**
 * Create a mock vscode.OutputChannel for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock OutputChannel for testing.
 *
 * @returns Mock OutputChannel with common methods as jest.Mock instances
 */
export const createMockOutputChannel = () => {
  return {
    appendLine: jest.fn(),
    dispose: jest.fn(),
  };
};
