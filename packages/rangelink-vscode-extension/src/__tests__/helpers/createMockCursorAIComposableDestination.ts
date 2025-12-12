import {
  createMockSingletonComposablePasteDestination,
  type MockSingletonComposablePasteDestinationConfig,
} from './createMockSingletonComposablePasteDestination';

/**
 * Create a mock Cursor AI ComposablePasteDestination for testing (Paradigm B).
 *
 * Uses Paradigm B (real class with mocked capabilities). This creates an actual
 * ComposablePasteDestination instance with mock capabilities injected.
 *
 * For Paradigm A (pure jest mocks), use createMockCursorAIDestination instead.
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as Cursor AI
 */
export const createMockCursorAIComposableDestination = (
  overrides?: Omit<MockSingletonComposablePasteDestinationConfig, 'id'>,
) =>
  createMockSingletonComposablePasteDestination({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    jumpSuccessMessage: '✓ Focused Cursor AI',
    loggingDetails: { assistantType: 'cursor-ai' },
    ...overrides,
  });
