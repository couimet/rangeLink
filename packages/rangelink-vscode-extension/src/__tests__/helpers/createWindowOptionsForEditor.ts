import { createMockEditor } from './createMockEditor';

/**
 * Create window options with an editor configured for testing.
 *
 * Sets up both activeTextEditor and showTextDocument to ensure the editor
 * is available regardless of how the code accesses it. Hides VSCode API
 * implementation details from tests.
 *
 * This helper provides a unified way to configure an editor in tests without
 * needing to know the distinction between:
 * - `activeTextEditor` (synchronous property for current editor)
 * - `showTextDocument` (async method for navigation)
 *
 * @param editor - The mock editor to use in this test
 * @returns Window options ready for createMockVscodeAdapter
 */
export const createWindowOptionsForEditor = (
  editor: ReturnType<typeof createMockEditor>,
) => {
  return {
    activeTextEditor: editor,
    showTextDocument: jest.fn().mockResolvedValue(editor),
  };
};
