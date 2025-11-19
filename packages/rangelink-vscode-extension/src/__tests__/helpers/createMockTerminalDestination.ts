/**
 * Create a mock TerminalDestination for testing
 */

import type { TerminalDestination } from '../../destinations/TerminalDestination';

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock TerminalDestination for testing
 *
 * Extends base PasteDestination mock with TerminalDestination-specific methods:
 * - setTerminal(terminal: vscode.Terminal | undefined): void
 * - getTerminalName(): string | undefined
 *
 * Note: Override parameter uses `any` for test flexibility (allows overriding readonly properties
 * like `displayName`), but return type is properly typed for type safety in test code.
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock terminal destination with jest.fn() implementations
 */
export const createMockTerminalDestination = (
  overrides?: Partial<any>,
): jest.Mocked<TerminalDestination> =>
  createMockPasteDestination({
    id: 'terminal',
    displayName: 'Terminal',
    getLoggingDetails: jest.fn().mockReturnValue({ terminalName: 'bash' }),
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Terminal: bash'),
    // TerminalDestination-specific methods
    setTerminal: jest.fn(),
    getTerminalName: jest.fn().mockReturnValue('bash'),
    ...overrides,
  }) as jest.Mocked<TerminalDestination>;
