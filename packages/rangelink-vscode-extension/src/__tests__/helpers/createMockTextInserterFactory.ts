import type { TextInserterFactory } from '../../destinations/capabilities/TextInserterFactory';

/**
 * Create a mock TextInserterFactory for testing.
 *
 * All methods are jest.fn() mocks that can be configured
 * with mockReturnValue, mockResolvedValue, etc.
 *
 * @returns Mock TextInserterFactory with jest.fn() implementations
 */
export const createMockTextInserterFactory = (): jest.Mocked<TextInserterFactory> =>
  ({
    createClipboardInserter: jest.fn(),
    createNativeCommandInserter: jest.fn(),
    createEditorInserter: jest.fn(),
  }) as unknown as jest.Mocked<TextInserterFactory>;
