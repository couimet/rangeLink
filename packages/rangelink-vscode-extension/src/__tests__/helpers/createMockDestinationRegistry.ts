import type { DestinationRegistry } from '../../destinations/DestinationRegistry';

/**
 * Create a mock DestinationRegistry for testing.
 *
 * All methods are jest.fn() mocks that can be configured
 * with mockReturnValue, mockResolvedValue, etc.
 *
 * @returns Mock DestinationRegistry with jest.fn() implementations
 */
export const createMockDestinationRegistry = (): jest.Mocked<DestinationRegistry> =>
  ({
    register: jest.fn(),
    create: jest.fn(),
    getSupportedTypes: jest.fn().mockReturnValue([]),
  }) as unknown as jest.Mocked<DestinationRegistry>;
