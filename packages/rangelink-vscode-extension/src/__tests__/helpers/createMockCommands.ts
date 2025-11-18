/**
 * Create a mock vscode.commands object for testing
 */

import * as vscode from 'vscode';

/**
 * Mock vscode.commands object for command execution tests.
 *
 * @returns Mock commands object with executeCommand spy
 */
export const createMockCommands = (): typeof vscode.commands => {
  return {
    executeCommand: jest.fn().mockResolvedValue(undefined),
  } as unknown as typeof vscode.commands;
};
