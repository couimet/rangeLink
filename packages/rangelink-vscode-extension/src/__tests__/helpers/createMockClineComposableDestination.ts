import {
  createMockSingletonComposablePasteDestination,
  type MockSingletonComposablePasteDestinationConfig,
} from './createMockSingletonComposablePasteDestination';

/**
 * Create a mock Cline ComposablePasteDestination for testing (Paradigm B).
 *
 * Uses Paradigm B (real class with mocked capabilities). This creates an actual
 * ComposablePasteDestination instance with mock capabilities injected.
 *
 * For Paradigm A (pure jest mocks), use createMockClineDestination instead.
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as Cline
 */
export const createMockClineComposableDestination = (overrides?: Omit<MockSingletonComposablePasteDestinationConfig, 'id'>) =>
  createMockSingletonComposablePasteDestination({
    id: 'cline',
    displayName: 'Cline',
    jumpSuccessMessage: '✓ Focused Cline',
    loggingDetails: { assistantType: 'cline' },
    ...overrides,
  });
