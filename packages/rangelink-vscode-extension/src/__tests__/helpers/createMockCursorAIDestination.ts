import {
  createMockPasteDestination,
  type MockDestinationOptions,
} from './createMockPasteDestination';

/**
 * Create a mock Cursor AI destination for testing.
 *
 * @param overrides - Optional overrides for mock behavior
 * @returns Mock PasteDestination configured as Cursor AI
 */
export const createMockCursorAIDestination = (overrides?: MockDestinationOptions) =>
  createMockPasteDestination({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    ...overrides,
  });
