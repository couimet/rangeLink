import type { FocusCapabilityFactory } from '../../destinations/capabilities';
import type { TieredFocusCapability } from '../../destinations/capabilities/TieredFocusCapability';

/**
 * Create a mock TieredFocusCapability for testing.
 *
 * Returns a minimal mock with a lastTierLabel property and focus as jest.fn().
 */
export const createMockTieredFocusCapability = (): jest.Mocked<TieredFocusCapability> =>
  ({
    lastTierLabel: undefined,
    focus: jest.fn(),
  }) as unknown as jest.Mocked<TieredFocusCapability>;

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
    createCustomAIAssistantCapability: jest.fn().mockReturnValue(createMockTieredFocusCapability()),
  }) as unknown as jest.Mocked<FocusCapabilityFactory>;
