/**
 * Create a mock Terminal for testing
 */

import * as vscode from 'vscode';

/**
 * Options for creating a mock terminal.
 */
export interface MockTerminalOptions {
  /** Terminal name (default: 'bash') */
  name?: string;
  /** Terminal process ID */
  processId?: Promise<number | undefined>;
  /** Terminal exit status */
  exitStatus?: vscode.TerminalExitStatus | undefined;
  /** Terminal creation options */
  creationOptions?: Readonly<vscode.TerminalOptions | vscode.ExtensionTerminalOptions>;
  /** Terminal state */
  state?: vscode.TerminalState;
}

/**
 * Create a mock Terminal with common methods stubbed.
 *
 * Supports two usage patterns:
 * 1. Pass a pre-built terminal object (if it has `sendText` method, treated as terminal)
 * 2. Pass options object to build a new mock terminal
 *
 * If a pre-built terminal with `sendText` is provided, it's used directly (avoiding unnecessary mock creation).
 *
 * @param terminalOrOptions - Optional property overrides or pre-built terminal object
 * @returns Mock Terminal object with Jest functions
 */
export const createMockTerminal = (
  terminalOrOptions?: Partial<vscode.Terminal> | MockTerminalOptions,
): vscode.Terminal => {
  // Simple check: if it has sendText, treat it as a pre-built terminal object
  if (terminalOrOptions && 'sendText' in terminalOrOptions) {
    return terminalOrOptions as vscode.Terminal;
  }

  // Otherwise, create default mock and spread options as overrides
  return {
    name: 'bash',
    processId: Promise.resolve(undefined),
    exitStatus: undefined,
    creationOptions: {},
    state: { isInteractedWith: false },
    sendText: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    ...terminalOrOptions,
  } as unknown as vscode.Terminal;
};
