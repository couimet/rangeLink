/**
 * Create a mock vscode.StatusBarItem for testing
 */

/**
 * Create a mock StatusBarItem for testing.
 *
 * @returns Mock StatusBarItem with common properties and methods as jest.Mock instances
 */
export const createMockStatusBarItem = () => {
  return {
    text: '',
    tooltip: undefined as string | undefined,
    command: undefined as string | undefined,
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  };
};
