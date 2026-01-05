import type * as vscode from 'vscode';

import {
  createMockComposablePasteDestination,
  type MockComposablePasteDestinationConfig,
} from './createMockComposablePasteDestination';
import { createMockDocument } from './createMockDocument';
import { createMockEditor } from './createMockEditor';
import { createMockUri } from './createMockUri';

/**
 * Configuration overrides for creating a mock editor ComposablePasteDestination.
 *
 * Extends base config with editor-specific options.
 */
export interface MockEditorComposablePasteDestinationConfig
  extends Omit<MockComposablePasteDestinationConfig, 'resource'> {
  /** Editor to use. If not provided, creates a mock editor. */
  editor?: vscode.TextEditor;
}

/**
 * Extract editor metadata from a TextEditor for building mock defaults.
 *
 * @param editor - The text editor
 * @returns Object with editorName (filename) and editorPath (full path)
 */
const getEditorMetadata = (
  editor: vscode.TextEditor,
): { editorName: string; editorPath: string } => {
  const editorPath = editor.document.uri.fsPath;
  const editorName = editorPath.split('/').pop() || 'Unknown';
  return { editorName, editorPath };
};

/**
 * Create a mock ComposablePasteDestination configured for text editor usage.
 *
 * Provides sensible editor defaults derived from the editor:
 * - id: 'text-editor'
 * - resource: { kind: 'editor', editor }
 * - displayName: Derived from editor path (e.g., 'Text Editor ("file.ts")')
 * - loggingDetails: { editorName, editorPath } derived from editor
 *
 * If no editor is provided, creates a default mock editor at '/workspace/src/file.ts'.
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as editor
 */
export const createMockEditorComposablePasteDestination = (
  overrides: MockEditorComposablePasteDestinationConfig = {},
): ReturnType<typeof createMockComposablePasteDestination> => {
  const { editor, ...rest } = overrides;

  const mockEditor =
    editor ??
    createMockEditor({
      document: createMockDocument({ uri: createMockUri('/workspace/src/file.ts') }),
    });

  const { editorName, editorPath } = getEditorMetadata(mockEditor);

  return createMockComposablePasteDestination({
    id: 'text-editor',
    displayName: overrides.displayName ?? `Text Editor ("${editorName}")`,
    resource: { kind: 'editor', editor: mockEditor },
    jumpSuccessMessage: `Jumped to editor: ${editorName}`,
    loggingDetails: { editorName, editorPath },
    ...rest,
  });
};
