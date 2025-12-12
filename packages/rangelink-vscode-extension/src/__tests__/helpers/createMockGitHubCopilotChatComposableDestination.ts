import {
  createMockSingletonComposablePasteDestination,
  type MockSingletonComposablePasteDestinationConfig,
} from './createMockSingletonComposablePasteDestination';

/**
 * Create a mock GitHub Copilot Chat ComposablePasteDestination for testing (Paradigm B).
 *
 * Uses Paradigm B (real class with mocked capabilities). This creates an actual
 * ComposablePasteDestination instance with mock capabilities injected.
 *
 * For Paradigm A (pure jest mocks), use createMockGitHubCopilotChatDestination instead.
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as GitHub Copilot Chat
 */
export const createMockGitHubCopilotChatComposableDestination = (
  overrides?: Omit<MockSingletonComposablePasteDestinationConfig, 'id'>,
) =>
  createMockSingletonComposablePasteDestination({
    id: 'github-copilot-chat',
    displayName: 'GitHub Copilot Chat',
    jumpSuccessMessage: '✓ Focused GitHub Copilot Chat',
    loggingDetails: { assistantType: 'github-copilot-chat' },
    ...overrides,
  });
