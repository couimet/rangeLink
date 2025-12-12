import {
  createBaseMockPasteDestination,
  type MockDestinationOptions,
} from './createBaseMockPasteDestination';

/**
 * Create a mock Claude Code destination for testing (Paradigm A).
 *
 * Uses Paradigm A (pure jest mocks). For Paradigm B (real class with mocked
 * capabilities), use createMockClaudeCodeComposableDestination.
 *
 * @param overrides - Optional overrides for mock behavior
 * @returns Mock PasteDestination configured as Claude Code
 */
export const createMockClaudeCodeDestination = (overrides?: Omit<MockDestinationOptions, 'id'>) =>
  createBaseMockPasteDestination({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    ...overrides,
  });
