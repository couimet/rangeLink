import {
  createMockPasteDestination,
  type MockDestinationOptions,
} from './createMockPasteDestination';

/**
 * Create a mock Claude Code destination for testing.
 *
 * @param overrides - Optional overrides for mock behavior
 * @returns Mock PasteDestination configured as Claude Code
 */
export const createMockClaudeCodeDestination = (overrides?: MockDestinationOptions) =>
  createMockPasteDestination({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    ...overrides,
  });
