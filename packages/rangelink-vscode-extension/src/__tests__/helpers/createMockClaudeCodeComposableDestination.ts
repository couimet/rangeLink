import {
  createMockSingletonComposablePasteDestination,
  type MockSingletonComposablePasteDestinationConfig,
} from './createMockSingletonComposablePasteDestination';

/**
 * Create a mock Claude Code ComposablePasteDestination for testing (Paradigm B).
 *
 * Uses Paradigm B (real class with mocked capabilities). This creates an actual
 * ComposablePasteDestination instance with mock capabilities injected.
 *
 * For Paradigm A (pure jest mocks), use createMockClaudeCodeDestination instead.
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as Claude Code
 */
export const createMockClaudeCodeComposableDestination = (
  overrides?: Omit<MockSingletonComposablePasteDestinationConfig, 'id'>,
) =>
  createMockSingletonComposablePasteDestination({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    jumpSuccessMessage: '✓ Focused Claude Code',
    loggingDetails: { assistantType: 'claude-code' },
    ...overrides,
  });
