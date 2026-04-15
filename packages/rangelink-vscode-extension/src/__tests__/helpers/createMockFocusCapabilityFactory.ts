import type { FocusCapabilityFactory } from '../../destinations/capabilities';
import type { LazyResolvedFocusCapability } from '../../destinations/capabilities/LazyResolvedFocusCapability';

/**
 * Create a mock LazyResolvedFocusCapability for testing.
 *
 * Returns a minimal mock with resolvedTierLabel, isFallbackResolution, and focus as jest.fn().
 */
export const createMockLazyResolvedFocusCapability = (): jest.Mocked<LazyResolvedFocusCapability> =>
  ({
    resolvedTierLabel: undefined,
    isFallbackResolution: false,
    focus: jest.fn(),
  }) as unknown as jest.Mocked<LazyResolvedFocusCapability>;

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
    buildCustomAIAssistantTiers: jest.fn().mockReturnValue([]),
    buildBuiltinFallbackTier: jest.fn().mockReturnValue({
      commands: [],
      insertFactory: { forTarget: jest.fn() },
      label: 'builtinFallback',
      probeMode: 'execute',
    }),
    createLazyResolvedCapability: jest
      .fn()
      .mockReturnValue(createMockLazyResolvedFocusCapability()),
  }) as unknown as jest.Mocked<FocusCapabilityFactory>;
