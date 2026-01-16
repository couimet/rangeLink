import { createMockDocument } from './createMockDocument';
import { createMockEditor } from './createMockEditor';
import { createMockPosition } from './createMockPosition';
import { createMockSelection } from './createMockSelection';
import { createMockText } from './createMockText';
import { createMockUri } from './createMockUri';
import { createMockVscodeAdapter } from './createMockVscodeAdapter';
import { createWindowOptionsForEditor } from './createWindowOptionsForEditor';

/**
 * Create a mock editor with selection(s) and pre-configured adapter.
 *
 * Consolidates the common pattern of creating document + editor + selections + adapter
 * into a single helper, reducing 10+ lines of boilerplate to ~3 lines.
 *
 * @param options.content - Text content of the document
 * @param options.uri - Document URI (defaults to '/test/file.ts')
 * @param options.selections - Array of selections as [startLine, startCharacter, endLine, endCharacter]
 * @param options.adapterOptions - Optional additional adapter configuration
 * @returns Object with { editor, adapter, document } for test use
 */
export const createMockEditorWithSelection = (options: {
  content: string;
  uri?: string;
  selections: [number, number, number, number][];
  adapterOptions?: Parameters<typeof createMockVscodeAdapter>[0];
}) => {
  const mockUri = createMockUri(options.uri ?? '/test/file.ts');
  const mockDocument = createMockDocument({
    getText: createMockText(options.content),
    uri: mockUri,
  });

  // Convert selection tuples to mock Selection objects
  const selections = options.selections.map(
    ([startLine, startCharacter, endLine, endCharacter]) => {
      const anchor = createMockPosition({ line: startLine, character: startCharacter });
      const active = createMockPosition({ line: endLine, character: endCharacter });
      const isEmpty = startLine === endLine && startCharacter === endCharacter;
      return createMockSelection({
        anchor,
        active,
        start: anchor,
        end: active,
        isReversed: false,
        isEmpty,
      });
    },
  );

  const mockEditor = createMockEditor({
    document: mockDocument,
    selections,
  });

  const mockAdapter = createMockVscodeAdapter({
    ...options.adapterOptions,
    windowOptions: {
      ...createWindowOptionsForEditor(mockEditor),
      ...options.adapterOptions?.windowOptions,
    },
  });

  return { editor: mockEditor, adapter: mockAdapter, document: mockDocument };
};
