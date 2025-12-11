/**
 * Create a mock terminal PasteDestination for testing.
 *
 * This creates a MOCK OBJECT (jest mocks) for unit testing services.
 * For a REAL ComposablePasteDestination instance, use createMockTerminalComposablePasteDestination.
 */

import { createMockPasteDestination, type MockDestinationOptions } from './createMockPasteDestination';

/**
 * Create a mock terminal PasteDestination for testing.
 *
 * Extends base PasteDestination mock with terminal-specific defaults:
 * - id: 'terminal'
 * - displayName: 'Terminal'
 * - getLoggingDetails: { terminalName: 'bash' }
 * - getJumpSuccessMessage: '✓ Focused Terminal: "bash"'
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock terminal destination with jest.fn() implementations
 */
export const createMockTerminalPasteDestination = (overrides?: MockDestinationOptions): any => {
  return createMockPasteDestination({
    id: 'terminal',
    displayName: 'Terminal',
    getLoggingDetails: jest.fn().mockReturnValue({ terminalName: 'bash' }),
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Terminal: "bash"'),
    ...overrides,
  });
};
