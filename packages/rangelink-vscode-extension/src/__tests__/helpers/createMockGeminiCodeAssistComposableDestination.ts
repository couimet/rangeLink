import {
  createMockSingletonComposablePasteDestination,
  type MockSingletonComposablePasteDestinationConfig,
} from './createMockSingletonComposablePasteDestination';

/**
 * Create a mock Gemini Code Assist ComposablePasteDestination for testing (Paradigm B).
 *
 * Uses Paradigm B (real class with mocked capabilities). This creates an actual
 * ComposablePasteDestination instance with mock capabilities injected.
 *
 * For Paradigm A (pure jest mocks), use createMockGeminiCodeAssistDestination instead.
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as Gemini Code Assist
 */
export const createMockGeminiCodeAssistComposableDestination = (
  overrides?: Omit<MockSingletonComposablePasteDestinationConfig, 'id'>,
) =>
  createMockSingletonComposablePasteDestination({
    id: 'gemini-code-assist',
    displayName: 'Gemini Code Assist',
    jumpSuccessMessage: '✓ Focused Gemini Code Assist',
    loggingDetails: { assistantType: 'gemini-code-assist' },
    ...overrides,
  });
