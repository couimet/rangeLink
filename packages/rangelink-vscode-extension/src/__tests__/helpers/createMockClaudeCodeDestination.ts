/**
 * Create a mock ClaudeCodeDestination for testing
 */

import type { ClaudeCodeDestination } from '../../destinations/ClaudeCodeDestination';

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock ClaudeCodeDestination for testing
 *
 * Convenience factory for ClaudeCode destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * Note: Override parameter uses `any` for test flexibility (allows overriding readonly properties),
 * but return type is properly typed for type safety in test code.
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock Claude Code destination with jest.fn() implementations
 */
export const createMockClaudeCodeDestination = (
  overrides?: Partial<any>,
): jest.Mocked<ClaudeCodeDestination> =>
  createMockPasteDestination({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Claude Code Chat'),
    ...overrides,
  }) as jest.Mocked<ClaudeCodeDestination>;
