import type { EligibilityCheckerFactory } from '../../destinations/capabilities/EligibilityCheckerFactory';

/**
 * Create a mock EligibilityCheckerFactory for testing.
 *
 * All methods are jest.fn() mocks that can be configured
 * with mockReturnValue, mockResolvedValue, etc.
 *
 * @returns Mock EligibilityCheckerFactory with jest.fn() implementations
 */
export const createMockEligibilityCheckerFactory = (): jest.Mocked<EligibilityCheckerFactory> =>
  ({
    createAlwaysEligible: jest.fn(),
    createSelfPasteChecker: jest.fn(),
  }) as unknown as jest.Mocked<EligibilityCheckerFactory>;
