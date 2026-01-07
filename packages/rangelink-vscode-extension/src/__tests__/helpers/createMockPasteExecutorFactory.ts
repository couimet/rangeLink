import type { PasteExecutorFactory } from '../../destinations/capabilities/PasteExecutorFactory';

/**
 * Create a mock PasteExecutorFactory for testing.
 *
 * @returns Mock PasteExecutorFactory with jest.fn() implementations
 */
export const createMockPasteExecutorFactory = (): jest.Mocked<PasteExecutorFactory> =>
  ({
    createEditorExecutor: jest.fn(),
    createTerminalExecutor: jest.fn(),
    createCommandExecutor: jest.fn(),
  }) as unknown as jest.Mocked<PasteExecutorFactory>;
