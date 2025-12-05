/**
 * Create a mock CursorAIDestination for testing
 */

import type { CursorAIDestination } from '../../destinations/CursorAIDestination';

import {
  createMockPasteDestination,
  type MockDestinationOptions,
} from './createMockPasteDestination';

/**
 * Create a mock CursorAIDestination for testing
 *
 * Convenience factory for CursorAI destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * **Convenience options:**
 * - `isAvailable: boolean` - Auto-wraps in jest.fn().mockResolvedValue()
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock Cursor AI destination with jest.fn() implementations
 */
export const createMockCursorAIDestination = (
  overrides?: MockDestinationOptions,
): jest.Mocked<CursorAIDestination> =>
  createMockPasteDestination({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Cursor AI Assistant'),
    ...overrides,
  }) as jest.Mocked<CursorAIDestination>;
