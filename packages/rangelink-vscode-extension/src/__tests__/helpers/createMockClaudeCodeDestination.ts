/**
 * Create a mock ClaudeCodeDestination for testing
 */

import type { ClaudeCodeDestination } from '../../destinations/ClaudeCodeDestination';

import {
  createMockPasteDestination,
  type MockDestinationOptions,
} from './createMockPasteDestination';

/**
 * Create a mock ClaudeCodeDestination for testing
 *
 * Convenience factory for ClaudeCode destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * **Convenience options:**
 * - `isAvailable: boolean` - Auto-wraps in jest.fn().mockResolvedValue()
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock Claude Code destination with jest.fn() implementations
 */
export const createMockClaudeCodeDestination = (
  overrides?: MockDestinationOptions,
): jest.Mocked<ClaudeCodeDestination> =>
  createMockPasteDestination({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Claude Code Chat'),
    ...overrides,
  }) as jest.Mocked<ClaudeCodeDestination>;
