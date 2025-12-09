import type { FocusManagerFactory } from '../../destinations/capabilities/FocusManagerFactory';

/**
 * Create a mock FocusManagerFactory for testing.
 *
 * All methods are jest.fn() mocks that can be configured
 * with mockReturnValue, mockResolvedValue, etc.
 *
 * @returns Mock FocusManagerFactory with jest.fn() implementations
 */
export const createMockFocusManagerFactory = (): jest.Mocked<FocusManagerFactory> =>
  ({
    createTerminalFocus: jest.fn(),
    createEditorFocus: jest.fn(),
    createCommandFocus: jest.fn(),
  }) as unknown as jest.Mocked<FocusManagerFactory>;
