/**
 * Create a mock PasteDestination for testing
 */

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
 *
 * This uses `any` typing because tests often use minimal mocks that don't implement
 * the full interface (e.g., missing pasteContent method for older tests).
 *
 * @example
 * createMockPasteDestination() // Uses all defaults
 * createMockPasteDestination({ displayName: 'Terminal' }) // Override displayName only
 * createMockPasteDestination({ id: 'text-editor' as any, displayName: 'Editor' })
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock destination with jest.fn() implementations
 */
export const createMockPasteDestination = (overrides?: Partial<any>): any => ({
  id: 'test-destination',
  displayName: 'Test Destination',
  isAvailable: jest.fn().mockResolvedValue(true),
  isEligibleForPasteLink: jest.fn().mockResolvedValue(true),
  isEligibleForPasteContent: jest.fn().mockResolvedValue(true),
  getUserInstruction: jest.fn().mockReturnValue(undefined),
  pasteLink: jest.fn().mockResolvedValue(true),
  pasteContent: jest.fn().mockResolvedValue(true),
  // Jump to Bound Destination methods (issue #99)
  focus: jest.fn().mockResolvedValue(true),
  getLoggingDetails: jest.fn().mockReturnValue({}),
  getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused'),
  equals: jest.fn().mockResolvedValue(false),
  ...overrides,
});
