/**
 * Create a mock vscode.commands object for testing
 */

import * as vscode from 'vscode';

/**
 * Mock vscode.commands object for command execution tests.
 *
 * @returns Mock commands object with executeCommand and registerCommand spies
 */
export const createMockCommands = (): typeof vscode.commands => {
  return {
    registerCommand: jest.fn(),
    executeCommand: jest.fn().mockResolvedValue(undefined),
  } as unknown as typeof vscode.commands;
};
