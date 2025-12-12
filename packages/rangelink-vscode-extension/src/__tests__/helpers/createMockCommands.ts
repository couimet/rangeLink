/**
 * Create a mock vscode.commands object for testing
 */

import * as vscode from 'vscode';

/**
 * Options for configuring mock commands.
 */
export interface MockCommandsOptions {
  /** List of command IDs that getCommands() should return */
  availableCommands?: string[];
}

/**
 * Mock vscode.commands object for command execution tests.
 *
 * @param options - Optional configuration for available commands
 * @returns Mock commands object with registerCommand, executeCommand, and getCommands spies
 */
export const createMockCommands = (options?: MockCommandsOptions): typeof vscode.commands => {
  const availableCommands = options?.availableCommands ?? [];

  return {
    registerCommand: jest.fn(),
    executeCommand: jest.fn().mockResolvedValue(undefined),
    getCommands: jest.fn().mockResolvedValue(availableCommands),
  } as unknown as typeof vscode.commands;
};
