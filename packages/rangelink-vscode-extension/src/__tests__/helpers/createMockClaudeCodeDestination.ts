/**
 * Create a mock ClaudeCodeDestination for testing
 */

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock ClaudeCodeDestination for testing
 *
 * Convenience factory for ClaudeCode destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock Claude Code destination with jest.fn() implementations
 */
export const createMockClaudeCodeDestination = (overrides?: Partial<any>): any =>
  createMockPasteDestination({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Claude Code Chat'),
    ...overrides,
  });
