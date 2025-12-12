import {
  createMockPasteDestination,
  type MockDestinationOptions,
} from './createMockPasteDestination';

/**
 * Create a mock GitHub Copilot Chat destination for testing.
 *
 * @param overrides - Optional overrides for mock behavior
 * @returns Mock PasteDestination configured as GitHub Copilot Chat
 */
export const createMockGitHubCopilotChatDestination = (overrides?: MockDestinationOptions) =>
  createMockPasteDestination({
    id: 'github-copilot-chat',
    displayName: 'GitHub Copilot Chat',
    ...overrides,
  });
