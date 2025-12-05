/**
 * Create a mock PasteDestination for testing
 */

/**
 * Options for creating mock destinations with convenience properties.
 *
 * **Convenience properties** (auto-wrapped in jest mocks):
 * - `isAvailable: boolean` → Automatically wraps in `jest.fn().mockResolvedValue(boolean)`
 *
 * **Manual overrides** (used as-is):
 * - Any other property is applied directly without transformation
 *
 * This allows both patterns:
 * ```typescript
 * // Convenient boolean syntax
 * createMockDestination({ isAvailable: false })
 *
 * // Advanced mock syntax (for custom implementations)
 * createMockDestination({ isAvailable: jest.fn().mockImplementation(...) })
 * ```
 */
export interface MockDestinationOptions {
  /** Convenience: true/false auto-wraps in jest.fn().mockResolvedValue() */
  isAvailable?: boolean | jest.Mock;
  [key: string]: any;
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
const processConvenienceOptions = (options?: MockDestinationOptions): Partial<any> => {
  if (!options) return {};

  const { isAvailable, ...rest } = options;
  const processed: Partial<any> = { ...rest };

  // Smart isAvailable handling: boolean → wrapped mock, jest.Mock → as-is
  if (isAvailable !== undefined) {
    processed.isAvailable =
      typeof isAvailable === 'boolean' ? jest.fn().mockResolvedValue(isAvailable) : isAvailable;
  }

  return processed;
};

/**
 * Create a mock PasteDestination for testing
 *
 * Provides a minimal mock implementation with sensible defaults for all required
 * PasteDestination interface methods. Individual properties/methods can be overridden
 * via the overrides parameter.
 *
 * This base factory only includes methods from the PasteDestination interface.
 * For destination-specific methods, use the specialized factories:
 * - createMockTerminalDestination() - adds setTerminal(), getTerminalName()
 * - createMockTextEditorDestination() - adds setEditor(), getBoundDocumentUri(), etc.
 * - createMockCursorAIDestination() - convenience wrapper with CursorAI defaults
 * - createMockClaudeCodeDestination() - convenience wrapper with ClaudeCode defaults
 * - createMockGitHubCopilotChatDestination() - convenience wrapper with GitHub Copilot defaults
 *
 * **Convenience options:**
 * - `isAvailable: boolean` - Automatically wraps in jest.fn().mockResolvedValue()
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock destination with jest.fn() implementations
 */
export const createMockPasteDestination = (overrides?: MockDestinationOptions): any => {
  const processedOverrides = processConvenienceOptions(overrides);

  return {
    id: 'test-destination',
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
    ...processedOverrides,
  };
};
