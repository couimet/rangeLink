/**
 * Create a mocked asRelativePath function for testing
 */

/**
 * Create a mocked asRelativePath function that returns a relative path.
 *
 * Encapsulates the common pattern: `jest.fn().mockReturnValue('src/file.ts')`
 *
 * @param relativePath - Relative path string to return (e.g., 'src/file.ts')
 * @returns Jest mock function that returns the relative path
 *
 * @example
 * ```typescript
 * const adapter = createMockVscodeAdapter({
 *   workspaceOptions: {
 *     asRelativePath: createMockAsRelativePath('src/file.ts'),
 *   },
 * });
 * ```
 */
export const createMockAsRelativePath = (relativePath: string) => {
  return jest.fn().mockReturnValue(relativePath);
};
