import {
  createMockComposablePasteDestination,
  type MockComposablePasteDestinationConfig,
} from './createMockComposablePasteDestination';

/**
 * Configuration overrides for creating a mock singleton ComposablePasteDestination.
 *
 * Extends base config, excluding resource (always singleton).
 */
export type MockSingletonComposablePasteDestinationConfig = Omit<
  MockComposablePasteDestinationConfig,
  'resource'
>;

/**
 * Create a mock ComposablePasteDestination configured as a singleton (no bound resource).
 *
 * Provides sensible singleton defaults:
 * - id: 'singleton'
 * - resource: { kind: 'singleton' }
 * - displayName: 'Mock Singleton Destination'
 *
 * Useful for testing code paths that handle non-terminal/non-editor destinations.
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as singleton
 */
export const createMockSingletonComposablePasteDestination = (
  overrides: MockSingletonComposablePasteDestinationConfig = {},
): ReturnType<typeof createMockComposablePasteDestination> => {
  return createMockComposablePasteDestination({
    id: 'github-copilot-chat', // Using valid DestinationType for singleton-style destination
    displayName: 'Mock Singleton Destination',
    resource: { kind: 'singleton' },
    jumpSuccessMessage: 'Focused singleton destination',
    loggingDetails: { type: 'singleton' },
    ...overrides,
  });
};
