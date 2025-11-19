/**
 * Create a mock TextEditorDestination for testing
 */

import type { TextEditorDestination } from '../../destinations/TextEditorDestination';

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock TextEditorDestination for testing
 *
 * Extends base PasteDestination mock with TextEditorDestination-specific getters:
 * - resourceName: string (raw filename/path)
 * - editorPath: string (absolute path)
 *
 * And methods:
 * - setEditor(editor: vscode.TextEditor | undefined): void
 * - getBoundDocumentUri(): vscode.Uri | undefined
 *
 * Note: Override parameter uses `any` for test flexibility (allows overriding readonly properties),
 * but return type is properly typed for type safety in test code.
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock text editor destination with jest.fn() implementations
 */
export const createMockTextEditorDestination = (overrides?: Partial<any>): any => {
  // Default values - can be overridden
  const defaultResourceName = overrides?.resourceName ?? 'src/file.ts';
  const defaultEditorPath = overrides?.editorPath ?? '/workspace/src/file.ts';

  return createMockPasteDestination({
    id: 'text-editor',
    displayName: 'Text Editor',
    resourceName: defaultResourceName,
    editorPath: defaultEditorPath,
    getLoggingDetails: jest
      .fn()
      .mockReturnValue({ editorName: defaultResourceName, editorPath: defaultEditorPath }),
    getJumpSuccessMessage: jest.fn().mockReturnValue(`✓ Focused Editor: "${defaultResourceName}"`),
    // TextEditorDestination-specific methods
    setEditor: jest.fn(),
    getBoundDocumentUri: jest.fn().mockReturnValue(undefined),
    ...overrides,
  });
};
