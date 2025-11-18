/**
 * Create a mock TextEditorDestination for testing
 */

import { createMockPasteDestination } from './createMockPasteDestination';

/**
 * Create a mock TextEditorDestination for testing
 *
 * Extends base PasteDestination mock with TextEditorDestination-specific methods:
 * - setEditor(editor: vscode.TextEditor | undefined): void
 * - getBoundDocumentUri(): vscode.Uri | undefined
 * - getEditorDisplayName(): string | undefined
 * - getEditorPath(): string | undefined
 *
 * @param overrides - Optional partial object to override default properties/methods
 * @returns Mock text editor destination with jest.fn() implementations
 */
export const createMockTextEditorDestination = (overrides?: Partial<any>): any =>
  createMockPasteDestination({
    id: 'text-editor',
    displayName: 'Text Editor',
    getLoggingDetails: jest
      .fn()
      .mockReturnValue({ editorDisplayName: 'src/file.ts', editorPath: '/workspace/src/file.ts' }),
    getJumpSuccessMessage: jest.fn().mockReturnValue('✓ Focused Editor: src/file.ts'),
    // TextEditorDestination-specific methods
    setEditor: jest.fn(),
    getBoundDocumentUri: jest.fn().mockReturnValue(undefined),
    getEditorDisplayName: jest.fn().mockReturnValue('src/file.ts'),
    getEditorPath: jest.fn().mockReturnValue('/workspace/src/file.ts'),
    ...overrides,
  });
