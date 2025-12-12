/**
 * Create a mock terminal PasteDestination for testing (Paradigm A).
 *
 * This creates a MOCK OBJECT (jest mocks) for unit testing services.
 * For a REAL ComposablePasteDestination instance (Paradigm B),
 * use createMockTerminalComposablePasteDestination.
 */

import {
  createBaseMockPasteDestination,
  type MockDestinationOptions,
} from './createBaseMockPasteDestination';

/**
 * Create a mock terminal PasteDestination for testing.
 *
 * Uses Paradigm A (pure jest mocks). For Paradigm B (real class with mocked
 * capabilities), use createMockTerminalComposablePasteDestination.
 *
 * Terminal-specific defaults:
 * - id: 'terminal'
 * - displayName: 'Terminal'
 * - getLoggingDetails: { terminalName: 'bash' }
 * - getJumpSuccessMessage: '✓ Focused Terminal: "bash"'
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock terminal destination with jest.fn() implementations
 */
export const createMockTerminalPasteDestination = (
  overrides?: Omit<MockDestinationOptions, 'id'>,
) => {
  return createBaseMockPasteDestination({
    id: 'terminal',
    displayName: 'Terminal',
    getLoggingDetails: jest.fn().mockReturnValue({ terminalName: 'bash' }),
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Terminal: "bash"'),
    ...overrides,
  });
};
