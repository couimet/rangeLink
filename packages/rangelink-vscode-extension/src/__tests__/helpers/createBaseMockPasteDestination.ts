/**
 * Base factory for creating mock PasteDestination objects.
 *
 * This is a BASE FACTORY - not intended for direct use in tests.
 * Use specialized helpers instead:
 * - createMockTerminalPasteDestination() - terminal destinations
 * - createMockCursorAIDestination() - Cursor AI destinations
 * - createMockClaudeCodeDestination() - Claude Code destinations
 * - createMockGitHubCopilotChatDestination() - GitHub Copilot Chat destinations
 *
 * For Paradigm B (real class with mocked capabilities), use:
 * - createMockEditorComposablePasteDestination() - text editor
 * - createMock*ComposableDestination() - AI assistants
 */

import type { DestinationType, PasteDestination } from '../../destinations';

/**
 * Options for mock destination creation (used by specialized helpers).
 *
 * Accepts any PasteDestination property plus convenience overrides.
 * Properties can be raw values or jest mocks.
 */
export interface MockDestinationOptions {
  /** Convenience: true/false auto-wraps in jest.fn().mockResolvedValue() */
  isAvailable?: boolean | jest.Mock;
  /** Override any PasteDestination property */
  [key: string]: unknown;
}

/**
 * Options for base mock destination creation.
 *
 * Requires explicit `id` to ensure tests are self-documenting.
 */
export interface BaseMockDestinationOptions extends MockDestinationOptions {
  /** Required: The destination type being mocked */
  id: DestinationType;
}

/**
 * Process convenience options, auto-wrapping booleans in appropriate jest mocks.
 *
 * **Smart transformation rules:**
 * - `isAvailable: boolean` → `jest.fn().mockResolvedValue(boolean)`
 * - `isAvailable: jest.Mock` → Used as-is (no transformation)
 * - Other properties → Passed through unchanged
 *
 * @param options - Raw options object with convenience properties
 * @returns Processed overrides ready for destination creation
 */
const processConvenienceOptions = (options?: MockDestinationOptions): Record<string, unknown> => {
  if (!options) return {};

  const { isAvailable, ...rest } = options;
  const processed: Record<string, unknown> = { ...rest };

  // Smart isAvailable handling: boolean → wrapped mock, jest.Mock → as-is
  if (isAvailable !== undefined) {
    processed.isAvailable =
      typeof isAvailable === 'boolean' ? jest.fn().mockResolvedValue(isAvailable) : isAvailable;
  }

  return processed;
};

/**
 * BASE FACTORY for creating mock PasteDestination objects.
 *
 * ⚠️ NOT INTENDED FOR DIRECT USE IN TESTS - use specialized helpers instead:
 * - createMockTerminalPasteDestination() - terminal destinations (Paradigm A)
 * - createMockCursorAIDestination() - Cursor AI destinations (Paradigm A)
 * - createMockClaudeCodeDestination() - Claude Code destinations (Paradigm A)
 * - createMockGitHubCopilotChatDestination() - GitHub Copilot Chat destinations (Paradigm A)
 *
 * For Paradigm B (real class with mocked capabilities):
 * - createMockEditorComposablePasteDestination() - text editor
 * - createMockCursorAIComposableDestination() - Cursor AI
 * - createMockClaudeCodeComposableDestination() - Claude Code
 * - createMockGitHubCopilotChatComposableDestination() - GitHub Copilot Chat
 *
 * **Why require explicit `id`?**
 * Forces test authors to be explicit about what they're testing, making tests
 * self-documenting and preventing accidental type mismatches.
 *
 * **Convenience options:**
 * - `isAvailable: boolean` - Automatically wraps in jest.fn().mockResolvedValue()
 *
 * @param options - Configuration with REQUIRED `id` and optional overrides
 * @returns Mock destination with jest.fn() implementations
 */
export const createBaseMockPasteDestination = (
  options: BaseMockDestinationOptions,
): jest.Mocked<PasteDestination> => {
  const { id, ...overrides } = options;
  const processedOverrides = processConvenienceOptions(overrides);

  return {
    id,
    displayName: 'Test Destination',
    isAvailable: jest.fn().mockResolvedValue(true),
    isEligibleForPasteLink: jest.fn().mockResolvedValue(true),
    isEligibleForPasteContent: jest.fn().mockResolvedValue(true),
    getUserInstruction: jest.fn().mockReturnValue(undefined),
    pasteLink: jest.fn().mockResolvedValue(true),
    pasteContent: jest.fn().mockResolvedValue(true),
    focus: jest.fn().mockResolvedValue(true),
    getLoggingDetails: jest.fn().mockReturnValue({}),
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused'),
    equals: jest.fn().mockResolvedValue(false),
    getDestinationUri: jest.fn().mockReturnValue(undefined),
    ...processedOverrides,
  } as unknown as jest.Mocked<PasteDestination>;
};
