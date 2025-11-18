/**
 * Create a mock Terminal for testing
 */

import * as vscode from 'vscode';

/**
 * Create a mock Terminal with common methods stubbed.
 *
 * @param name - Terminal name (default: 'bash')
 * @returns Mock Terminal object with Jest functions
 */
export const createMockTerminal = (name = 'bash'): vscode.Terminal => {
  return {
    name,
    sendText: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  } as unknown as vscode.Terminal;
};
