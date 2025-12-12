import {
  createBaseMockPasteDestination,
  type MockDestinationOptions,
} from './createBaseMockPasteDestination';

/**
 * Create a mock Cursor AI destination for testing (Paradigm A).
 *
 * Uses Paradigm A (pure jest mocks). For Paradigm B (real class with mocked
 * capabilities), use createMockCursorAIComposableDestination.
 *
 * @param overrides - Optional overrides for mock behavior
 * @returns Mock PasteDestination configured as Cursor AI
 */
export const createMockCursorAIDestination = (overrides?: Omit<MockDestinationOptions, 'id'>) =>
  createBaseMockPasteDestination({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    ...overrides,
  });
