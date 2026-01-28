import type { DestinationType } from '../../types';

import {
  createMockComposablePasteDestination,
  type MockComposablePasteDestinationConfig,
} from './createMockComposablePasteDestination';

/**
 * Configuration for creating a mock singleton ComposablePasteDestination.
 *
 * Extends base config, excluding resource (always singleton).
 * Requires explicit `id` for consistency with other mock helpers.
 */
export interface MockSingletonComposablePasteDestinationConfig
  extends Omit<MockComposablePasteDestinationConfig, 'resource' | 'id'> {
  /** Required: The destination type being mocked */
  id: DestinationType;
}

/**
 * BASE FACTORY for creating mock singleton ComposablePasteDestination objects.
 *
 * ⚠️ NOT INTENDED FOR DIRECT USE IN TESTS - use specialized helpers instead:
 * - createMockCursorAIComposableDestination() - Cursor AI (Paradigm B)
 * - createMockClaudeCodeComposableDestination() - Claude Code (Paradigm B)
 * - createMockGitHubCopilotChatComposableDestination() - GitHub Copilot Chat (Paradigm B)
 *
 * Creates a ComposablePasteDestination with singleton resource (no bound terminal/editor).
 *
 * **Why require explicit `id`?**
 * Forces test authors to be explicit about what they're testing, making tests
 * self-documenting and preventing accidental type mismatches.
 *
 * @param config - Configuration with REQUIRED `id` and optional overrides
 * @returns ComposablePasteDestination instance configured as singleton
 */
export const createMockSingletonComposablePasteDestination = (
  config: MockSingletonComposablePasteDestinationConfig,
): ReturnType<typeof createMockComposablePasteDestination> => {
  const { id, ...overrides } = config;
  return createMockComposablePasteDestination({
    id,
    displayName: overrides.displayName ?? 'Mock Singleton Destination',
    resource: { kind: 'singleton' },
    jumpSuccessMessage: overrides.jumpSuccessMessage ?? 'Focused singleton destination',
    loggingDetails: overrides.loggingDetails ?? { type: 'singleton' },
    ...overrides,
  });
};
