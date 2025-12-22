/**
 * Create a mock vscode.commands object for testing
 */

/**
 * Type for mock commands overrides
 */
export interface MockCommandsOverrides {
  registerCommand?: jest.Mock;
  executeCommand?: jest.Mock;
  getCommands?: jest.Mock;
  /** Convenience: list of command IDs that getCommands() should return */
  availableCommands?: string[];
}

/**
 * Create a mock commands object for testing.
 *
 * This is the canonical way to mock command operations. Use this utility
 * instead of creating inline mocks to ensure consistency across tests.
 *
 * @param overrides - Optional property overrides for specialized behavior
 * @returns Mock commands object with registerCommand, executeCommand, and getCommands methods
 */
export const createMockCommands = (overrides?: MockCommandsOverrides) => {
  const { availableCommands, ...restOverrides } = overrides ?? {};

  const baseCommands = {
    registerCommand: jest.fn(),
    executeCommand: jest.fn().mockResolvedValue(undefined),
    getCommands: jest.fn().mockResolvedValue(availableCommands ?? []),
  };

  return {
    ...baseCommands,
    ...restOverrides,
  };
};

/**
 * Type for the mock commands returned by createMockCommands()
 */
export type MockCommands = ReturnType<typeof createMockCommands>;
