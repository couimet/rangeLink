/**
 * Configure workspace to simulate a file outside any workspace folder
 */

/**
 * Configure workspace to simulate a file outside any workspace folder.
 *
 * Sets getWorkspaceFolder to return undefined, indicating the file
 * is not within any workspace. Useful for testing edge cases like
 * standalone files or files from external locations.
 *
 * @param mockVscode - The mocked vscode instance (from adapter.__getVscodeInstance())
 */
export const simulateFileOutsideWorkspace = (mockVscode: any): void => {
  (mockVscode.workspace.getWorkspaceFolder as jest.Mock) = jest.fn().mockReturnValue(undefined);
};
