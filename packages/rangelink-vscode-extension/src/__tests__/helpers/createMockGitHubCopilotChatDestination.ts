/**
 * Create a mock GitHubCopilotChatDestination for testing
 */

import type { GitHubCopilotChatDestination } from '../../destinations/GitHubCopilotChatDestination';

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock GitHubCopilotChatDestination for testing
 *
 * Convenience factory for GitHub Copilot Chat destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * Note: Override parameter uses `any` for test flexibility (allows overriding readonly properties),
 * but return type is properly typed for type safety in test code.
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock GitHub Copilot Chat destination with jest.fn() implementations
 */
export const createMockGitHubCopilotChatDestination = (
  overrides?: Partial<any>,
): jest.Mocked<GitHubCopilotChatDestination> =>
  createMockPasteDestination({
    id: 'github-copilot-chat',
    displayName: 'GitHub Copilot Chat',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused GitHub Copilot Chat'),
    ...overrides,
  }) as jest.Mocked<GitHubCopilotChatDestination>;
