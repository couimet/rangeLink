/**
 * Create a mock ChatPasteHelperFactory for testing.
 *
 * Provides a factory that returns a mock ChatPasteHelper with configurable behavior.
 */

import type { ChatPasteHelper } from '../../destinations/ChatPasteHelper';
import type { ChatPasteHelperFactory } from '../../destinations/ChatPasteHelperFactory';

/**
 * Mock ChatPasteHelper type with jest mocks.
 */
export type MockChatPasteHelper = {
  attemptPaste: jest.Mock<Promise<boolean>, [text: string, logContext: any]>;
};

/**
 * Create a mock ChatPasteHelper with default behavior.
 *
 * @param pasteSucceeds - Whether attemptPaste should resolve to true (default: true)
 * @returns Mock ChatPasteHelper
 */
export const createMockChatPasteHelper = (pasteSucceeds = true): MockChatPasteHelper => {
  return {
    attemptPaste: jest.fn().mockResolvedValue(pasteSucceeds),
  };
};

/**
 * Create a mock ChatPasteHelperFactory for testing destination classes.
 *
 * The factory's create() method returns a mock ChatPasteHelper that can be
 * configured to simulate successful or failed paste operations.
 *
 * @param pasteSucceeds - Whether the helper's attemptPaste should succeed (default: true)
 * @returns Mock ChatPasteHelperFactory with jest.Mocked type
 *
 * @example
 * ```typescript
 * const mockFactory = createMockChatPasteHelperFactory();
 * const destination = new ClaudeCodeDestination(adapter, mockFactory, logger);
 *
 * // Verify factory was called
 * await destination.pasteLink(link);
 * expect(mockFactory.create).toHaveBeenCalledTimes(1);
 *
 * // Get the helper instance to verify paste was called
 * const helper = mockFactory.create();
 * expect(helper.attemptPaste).toHaveBeenCalledWith(text, logContext);
 * ```
 *
 * @example
 * ```typescript
 * // Simulate paste failure
 * const mockFactory = createMockChatPasteHelperFactory(false);
 * const destination = new ClaudeCodeDestination(adapter, mockFactory, logger);
 * ```
 */
export const createMockChatPasteHelperFactory = (
  pasteSucceeds = true,
): jest.Mocked<ChatPasteHelperFactory> => {
  const mockHelper = createMockChatPasteHelper(pasteSucceeds);

  return {
    create: jest.fn().mockReturnValue(mockHelper as unknown as ChatPasteHelper),
  } as unknown as jest.Mocked<ChatPasteHelperFactory>;
};
