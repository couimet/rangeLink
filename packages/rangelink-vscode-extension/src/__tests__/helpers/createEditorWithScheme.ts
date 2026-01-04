import { createMockDocument } from './createMockDocument';
import { createMockEditor } from './createMockEditor';
import { createMockUri } from './createMockUri';

/**
 * Creates a mock editor with a specified URI scheme.
 * Useful for testing read-only detection (git, output, vscode-settings schemes).
 *
 * @param fsPath - File system path for the URI
 * @param scheme - URI scheme (defaults to 'file')
 */
export const createEditorWithScheme = (fsPath: string, scheme = 'file') => {
  const mockUri = createMockUri(fsPath, { scheme });
  const mockDocument = createMockDocument({ uri: mockUri });
  return createMockEditor({ document: mockDocument });
};
