/**
 * Create a mock CursorAIDestination for testing
 */

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock CursorAIDestination for testing
 *
 * Convenience factory for CursorAI destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock Cursor AI destination with jest.fn() implementations
 */
export const createMockCursorAIDestination = (overrides?: Partial<any>): any =>
  createMockPasteDestination({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Cursor AI Assistant'),
    ...overrides,
  });
