/**
 * Create a mock CursorAIDestination for testing
 */

import type { CursorAIDestination } from '../../destinations/CursorAIDestination';

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock CursorAIDestination for testing
 *
 * Convenience factory for CursorAI destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * Note: Override parameter uses `any` for test flexibility (allows overriding readonly properties),
 * but return type is properly typed for type safety in test code.
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock Cursor AI destination with jest.fn() implementations
 */
export const createMockCursorAIDestination = (
  overrides?: Partial<any>,
): jest.Mocked<CursorAIDestination> =>
  createMockPasteDestination({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Cursor AI Assistant'),
    ...overrides,
  }) as jest.Mocked<CursorAIDestination>;
