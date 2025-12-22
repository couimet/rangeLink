/**
 * Create a mock vscode.Clipboard for testing
 */

/**
 * Type for mock clipboard overrides
 */
export interface MockClipboardOverrides {
  writeText?: jest.Mock;
  readText?: jest.Mock;
}

/**
 * Create a mock Clipboard for testing.
 *
 * This is the canonical way to mock clipboard operations. Use this utility
 * instead of creating inline mocks to ensure consistency across tests.
 *
 * @param overrides - Optional property overrides for specialized behavior
 * @returns Mock Clipboard with writeText and readText methods
 */
export const createMockClipboard = (overrides?: MockClipboardOverrides) => {
  const baseClipboard = {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  };

  return {
    ...baseClipboard,
    ...overrides,
  };
};

/**
 * Type for the mock clipboard returned by createMockClipboard()
 */
export type MockClipboard = ReturnType<typeof createMockClipboard>;
