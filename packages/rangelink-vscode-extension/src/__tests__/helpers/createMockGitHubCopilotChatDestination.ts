import {
  createBaseMockPasteDestination,
  type MockDestinationOptions,
} from './createBaseMockPasteDestination';

/**
 * Create a mock GitHub Copilot Chat destination for testing (Paradigm A).
 *
 * Uses Paradigm A (pure jest mocks). For Paradigm B (real class with mocked
 * capabilities), use createMockGitHubCopilotChatComposableDestination.
 *
 * @param overrides - Optional overrides for mock behavior
 * @returns Mock PasteDestination configured as GitHub Copilot Chat
 */
export const createMockGitHubCopilotChatDestination = (
  overrides?: Omit<MockDestinationOptions, 'id'>,
) =>
  createBaseMockPasteDestination({
    id: 'github-copilot-chat',
    displayName: 'GitHub Copilot Chat',
    ...overrides,
  });
