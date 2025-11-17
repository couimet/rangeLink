/**
 * Common test utilities for PasteDestination implementations
 *
 * Provides reusable test patterns to ensure all destinations follow the same
 * contract and behavior. Reduces duplication across destination test files.
 */

import type { Logger } from 'barebone-logger';
import type {
  ComputedSelection,
  DelimiterConfig,
  FormattedLink,
  RangeFormat,
  SelectionType,
} from 'rangelink-core-ts';
import { LinkType } from 'rangelink-core-ts';

import type { DestinationType, PasteDestination } from '../../destinations/PasteDestination';

/**
 * Create a mock FormattedLink for testing
 *
 * Provides sensible defaults for all required properties. Individual properties
 * can be overridden via the partial parameter.
 *
 * @param link - The RangeLink string (default: 'test-link')
 * @param overrides - Optional partial FormattedLink to override defaults
 * @returns Mock FormattedLink with all required properties
 */
export const createMockFormattedLink = (
  link = 'test-link',
  overrides: Partial<FormattedLink> = {},
): FormattedLink => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    range: '-',
    hash: '#',
  };

  const defaultSelection: ComputedSelection = {
    startLine: 1,
    startPosition: 1,
    endLine: 1,
    endPosition: 10,
    rangeFormat: 'LineOnly' as RangeFormat,
  };

  return {
    link,
    linkType: LinkType.Regular,
    delimiters: defaultDelimiters,
    computedSelection: defaultSelection,
    rangeFormat: 'LineOnly' as RangeFormat,
    selectionType: 'Normal' as SelectionType,
    ...overrides,
  };
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
 *
 * This uses `any` typing because tests often use minimal mocks that don't implement
 * the full interface (e.g., missing pasteContent method for older tests).
 *
 * @example
 * createMockDestination() // Uses all defaults
 * createMockDestination({ displayName: 'Terminal' }) // Override displayName only
 * createMockDestination({ id: 'text-editor' as any, displayName: 'Editor' })
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock destination with jest.fn() implementations
 */
export const createMockDestination = (overrides?: Partial<any>): any => ({
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
  ...overrides,
});

/**
 * Create a mock TerminalDestination for testing
 *
 * Extends base PasteDestination mock with TerminalDestination-specific methods:
 * - setTerminal(terminal: vscode.Terminal | undefined): void
 * - getTerminalName(): string | undefined
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock terminal destination with jest.fn() implementations
 */
export const createMockTerminalDestination = (overrides?: Partial<any>): any =>
  createMockDestination({
    id: 'terminal',
    displayName: 'Terminal',
    getLoggingDetails: jest.fn().mockReturnValue({ terminalName: 'bash' }),
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Terminal: bash'),
    // TerminalDestination-specific methods
    setTerminal: jest.fn(),
    getTerminalName: jest.fn().mockReturnValue('bash'),
    ...overrides,
  });

/**
 * Create a mock TextEditorDestination for testing
 *
 * Extends base PasteDestination mock with TextEditorDestination-specific methods:
 * - setEditor(editor: vscode.TextEditor | undefined): void
 * - getBoundDocumentUri(): vscode.Uri | undefined
 * - getEditorDisplayName(): string | undefined
 * - getEditorPath(): string | undefined
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock text editor destination with jest.fn() implementations
 */
export const createMockTextEditorDestination = (overrides?: Partial<any>): any =>
  createMockDestination({
    id: 'text-editor',
    displayName: 'Text Editor',
    getLoggingDetails: jest
      .fn()
      .mockReturnValue({ editorDisplayName: 'src/file.ts', editorPath: '/workspace/src/file.ts' }),
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Editor: src/file.ts'),
    // TextEditorDestination-specific methods
    setEditor: jest.fn(),
    getBoundDocumentUri: jest.fn().mockReturnValue(undefined),
    getEditorDisplayName: jest.fn().mockReturnValue('src/file.ts'),
    getEditorPath: jest.fn().mockReturnValue('/workspace/src/file.ts'),
    ...overrides,
  });

/**
 * Create a mock CursorAIDestination for testing
 *
 * Convenience factory for CursorAI destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock Cursor AI destination with jest.fn() implementations
 */
export const createMockCursorAIDestination = (overrides?: Partial<any>): any =>
  createMockDestination({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Cursor AI Assistant'),
    ...overrides,
  });

/**
 * Create a mock ClaudeCodeDestination for testing
 *
 * Convenience factory for ClaudeCode destination with appropriate defaults.
 * Uses base PasteDestination mock (no extra methods beyond interface).
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock Claude Code destination with jest.fn() implementations
 */
export const createMockClaudeCodeDestination = (overrides?: Partial<any>): any =>
  createMockDestination({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Claude Code Chat'),
    ...overrides,
  });

/**
 * Test interface compliance for a destination
 *
 * Verifies that a destination has the required properties:
 * - id (DestinationType)
 * - displayName (string)
 * - isAvailable (async function)
 * - pasteLink (async function)
 *
 * @param destination - The destination instance to test
 * @param expectedId - Expected id value
 * @param expectedDisplayName - Expected displayName value
 */
export const testDestinationInterfaceCompliance = (
  destination: PasteDestination,
  expectedId: DestinationType,
  expectedDisplayName: string,
): void => {
  describe('Interface compliance', () => {
    it('should have correct id', () => {
      expect(destination.id).toBe(expectedId);
    });

    it('should have correct displayName', () => {
      expect(destination.displayName).toBe(expectedDisplayName);
    });

    it('should have isAvailable method', () => {
      expect(typeof destination.isAvailable).toBe('function');
    });

    it('should have pasteLink method', () => {
      expect(typeof destination.pasteLink).toBe('function');
    });

    it('should have async isAvailable method', async () => {
      const result = destination.isAvailable();
      expect(result).toBeInstanceOf(Promise);
      await result; // Wait for promise to resolve
    });

    it('should have async pasteLink method', async () => {
      const result = destination.pasteLink(createMockFormattedLink('test'));
      expect(result).toBeInstanceOf(Promise);
      await result; // Wait for promise to resolve
    });
  });
};

/**
 * Test logging behavior for a destination
 *
 * Verifies that destinations log appropriately for debugging:
 * - Debug logs for availability checks
 * - Info logs for successful pastes
 * - Warn/error logs for failures
 *
 * @param mockLogger - The mock logger instance
 * @param loggerCalls - Expected logger method calls with contexts
 */
export const testDestinationLogging = (
  mockLogger: Logger,
  loggerCalls: {
    method: 'debug' | 'info' | 'warn' | 'error';
    expectedContext: Record<string, unknown>;
    expectedMessage: string;
  }[],
): void => {
  describe('Logging', () => {
    loggerCalls.forEach(({ method, expectedContext, expectedMessage }, index) => {
      it(`should log via ${method} (call ${index + 1})`, () => {
        expect(mockLogger[method]).toHaveBeenCalledWith(
          expect.objectContaining(expectedContext),
          expectedMessage,
        );
      });
    });
  });
};

/**
 * Test paste return values
 *
 * Verifies that pasteLink() returns correct boolean values:
 * - true on success
 * - false on failure (not available, error, etc.)
 *
 * @param destination - The destination instance
 * @param successScenario - Function that sets up successful paste
 * @param failureScenario - Function that sets up failed paste
 */
export const testPasteReturnValues = (
  destination: PasteDestination,
  successScenario: () => Promise<void>,
  failureScenario: () => Promise<void>,
): void => {
  describe('pasteLink() return values', () => {
    it('should return true on successful paste', async () => {
      await successScenario();
      const result = await destination.pasteLink(createMockFormattedLink('test'));
      expect(result).toBe(true);
    });

    it('should return false when destination not available', async () => {
      await failureScenario();
      const result = await destination.pasteLink(createMockFormattedLink('test'));
      expect(result).toBe(false);
    });
  });
};

/**
 * Test isAvailable() behavior
 *
 * Verifies that isAvailable() returns correct boolean values based on state.
 *
 * @param destination - The destination instance
 * @param availableScenario - Function that makes destination available
 * @param unavailableScenario - Function that makes destination unavailable
 */
export const testIsAvailableBehavior = (
  destination: PasteDestination,
  availableScenario: () => Promise<void>,
  unavailableScenario: () => Promise<void>,
): void => {
  describe('isAvailable()', () => {
    it('should return true when destination is available', async () => {
      await availableScenario();
      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when destination is not available', async () => {
      await unavailableScenario();
      expect(await destination.isAvailable()).toBe(false);
    });
  });
};
