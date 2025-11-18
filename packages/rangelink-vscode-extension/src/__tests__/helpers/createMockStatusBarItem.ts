/**
 * Create a mock vscode.StatusBarItem for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock StatusBarItem for testing.
 *
 * @returns Mock StatusBarItem with common methods as jest.Mock instances
 */
export const createMockStatusBarItem = () => {
  return {
    text: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  };
};
