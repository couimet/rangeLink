/**
 * Create a mock Uri namespace for testing
 */

/**
 * Create a mock Uri namespace for navigation tests.
 *
 * Provides mock implementations for Uri.file() and Uri.parse() methods.
 * For creating actual URI instances, use createMockUriInstance().
 *
 * @param overrides - Optional overrides for file/parse implementations
 * @returns Mock Uri with file and parse methods
 */
export const createMockUri = (overrides?: { file?: jest.Mock; parse?: jest.Mock }) => ({
  file:
    overrides?.file ||
    jest.fn((fsPath: string) => ({
      fsPath,
      scheme: 'file',
      path: fsPath,
      toString: () => `file://${fsPath}`,
    })),
  parse:
    overrides?.parse ||
    jest.fn((str: string) => ({
      scheme: str.startsWith('file:') ? 'file' : 'command',
      path: str,
      toString: () => str,
      fsPath: str.replace(/^file:\/\//, ''),
    })),
});
