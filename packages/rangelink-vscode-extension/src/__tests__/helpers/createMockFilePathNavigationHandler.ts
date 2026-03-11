import type { FilePathNavigationHandler } from '../../navigation/FilePathNavigationHandler';

/**
 * Create a mock FilePathNavigationHandler for provider tests.
 *
 * Mocks all handler methods to focus tests on provider orchestration logic.
 * Tests verify delegation patterns, not handler implementation details.
 *
 * @param options - Optional method overrides
 * @returns Mock navigation handler
 */
export const createMockFilePathNavigationHandler = (
  options?: Partial<jest.Mocked<FilePathNavigationHandler>>,
): jest.Mocked<FilePathNavigationHandler> =>
  ({
    navigateToFile: jest.fn().mockResolvedValue(undefined),
    ...options,
  }) as unknown as jest.Mocked<FilePathNavigationHandler>;
