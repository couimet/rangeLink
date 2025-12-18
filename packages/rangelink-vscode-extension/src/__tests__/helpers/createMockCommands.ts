/**
 * Create a mock vscode.commands object for testing
 */

import * as vscode from 'vscode';

/**
 * Special configuration options for mock commands.
 */
export interface MockCommandsOptions {
  /** List of command IDs that getCommands() should return */
  availableCommands?: string[];
}

/**
 * Input type for createMockCommands - accepts either special config or direct overrides.
 */
export type MockCommandsInput = MockCommandsOptions | Partial<typeof vscode.commands>;

/**
 * Mock vscode.commands object for command execution tests.
 *
 * @param options - Optional configuration or property overrides
 * @returns Mock commands object with registerCommand, executeCommand, and getCommands spies
 */
export const createMockCommands = (options?: MockCommandsInput): typeof vscode.commands => {
  const availableCommands = (options as MockCommandsOptions)?.availableCommands ?? [];

  return {
    registerCommand: jest.fn(),
    executeCommand: jest.fn().mockResolvedValue(undefined),
    getCommands: jest.fn().mockResolvedValue(availableCommands),
    ...options,
  } as unknown as typeof vscode.commands;
};
