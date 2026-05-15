import {
  createBaseMockPasteDestination,
  type MockDestinationOptions,
} from './createBaseMockPasteDestination';

/**
 * Create a mock Gemini Code Assist destination for testing (Paradigm A).
 *
 * Uses Paradigm A (pure jest mocks). For Paradigm B (real class with mocked
 * capabilities), use createMockGeminiCodeAssistComposableDestination.
 *
 * @param overrides - Optional overrides for mock behavior
 * @returns Mock PasteDestination configured as Gemini Code Assist
 */
export const createMockGeminiCodeAssistDestination = (
  overrides?: Omit<MockDestinationOptions, 'id'>,
) =>
  createBaseMockPasteDestination({
    id: 'gemini-code-assist',
    displayName: 'Gemini Code Assist',
    ...overrides,
  });
