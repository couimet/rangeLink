/**
 * Create a mock TerminalDestination for testing
 */

import { createMockPasteDestination } from './createMockPasteDestination';

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
  createMockPasteDestination({
    id: 'terminal',
    displayName: 'Terminal',
    getLoggingDetails: jest.fn().mockReturnValue({ terminalName: 'bash' }),
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Terminal: bash'),
    // TerminalDestination-specific methods
    setTerminal: jest.fn(),
    getTerminalName: jest.fn().mockReturnValue('bash'),
    ...overrides,
  });
