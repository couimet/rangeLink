import type { FocusCapabilityFactory } from '../../destinations/capabilities';

/**
 * Create a mock FocusCapabilityFactory for testing.
 *
 * Returns a jest-mocked factory with all methods as jest.fn().
 */
export const createMockFocusCapabilityFactory = (): jest.Mocked<FocusCapabilityFactory> =>
  ({
    createEditorCapability: jest.fn(),
    createTerminalCapability: jest.fn(),
    createAIAssistantCapability: jest.fn(),
  }) as unknown as jest.Mocked<FocusCapabilityFactory>;
