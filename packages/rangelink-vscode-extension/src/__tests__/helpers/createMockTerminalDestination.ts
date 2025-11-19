/**
 * Create a mock TerminalDestination for testing
 */

import type { TerminalDestination } from '../../destinations/TerminalDestination';

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock TerminalDestination for testing
 *
 * Extends base PasteDestination mock with TerminalDestination-specific getter:
 * - resourceName: string (raw terminal name)
 *
 * And method:
 * - setTerminal(terminal: vscode.Terminal | undefined): void
 *
 * Note: Override parameter uses `any` for test flexibility (allows overriding readonly properties
 * like `displayName`), but return type is properly typed for type safety in test code.
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock terminal destination with jest.fn() implementations
 */
export const createMockTerminalDestination = (overrides?: Partial<any>): any => {
  // Default values - can be overridden
  const defaultResourceName = overrides?.resourceName ?? 'bash';

  return createMockPasteDestination({
    id: 'terminal',
    displayName: 'Terminal',
    resourceName: defaultResourceName,
    getLoggingDetails: jest.fn().mockReturnValue({ terminalName: defaultResourceName }),
    getJumpSuccessMessage: jest
      .fn()
      .mockReturnValue(`✓ Focused Terminal: "${defaultResourceName}"`),
    // TerminalDestination-specific methods
    setTerminal: jest.fn(),
    ...overrides,
  });
};
