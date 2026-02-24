import type * as vscode from 'vscode';

import {
  createMockComposablePasteDestination,
  type MockComposablePasteDestinationConfig,
} from './createMockComposablePasteDestination';
import { createMockUri } from './createMockUri';

/**
 * Configuration overrides for creating a mock editor ComposablePasteDestination.
 *
 * Extends base config with editor-specific options.
 */
export interface MockEditorComposablePasteDestinationConfig
  extends Omit<MockComposablePasteDestinationConfig, 'resource'> {
  /** URI to use. If not provided, creates a mock URI. */
  uri?: vscode.Uri;
  /** View column to use. Defaults to 1. */
  viewColumn?: number;
}

/**
 * Extract file metadata from a URI for building mock defaults.
 *
 * @param uri - The URI
 * @returns Object with editorName (filename) and editorPath (full path)
 */
const getUriMetadata = (
  uri: vscode.Uri,
): { editorName: string; editorPath: string } => {
  const editorPath = uri.fsPath;
  const editorName = editorPath.split('/').pop() || 'Unknown';
  return { editorName, editorPath };
};

/**
 * Create a mock ComposablePasteDestination configured for text editor usage.
 *
 * Provides sensible editor defaults derived from the URI:
 * - id: 'text-editor'
 * - resource: { kind: 'editor', uri, viewColumn }
 * - displayName: Derived from URI path (e.g., 'Text Editor ("file.ts")')
 * - loggingDetails: { editorName, editorPath } derived from URI
 *
 * If no URI is provided, creates a default mock URI at '/workspace/src/file.ts'.
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as editor
 */
export const createMockEditorComposablePasteDestination = (
  overrides: MockEditorComposablePasteDestinationConfig = {},
): ReturnType<typeof createMockComposablePasteDestination> => {
  const { uri, viewColumn, ...rest } = overrides;

  const mockUri = uri ?? createMockUri('/workspace/src/file.ts');
  const mockViewColumn = viewColumn ?? 1;

  const { editorName, editorPath } = getUriMetadata(mockUri);

  return createMockComposablePasteDestination({
    id: 'text-editor',
    displayName: overrides.displayName ?? `Text Editor ("${editorName}")`,
    resource: { kind: 'editor', uri: mockUri, viewColumn: mockViewColumn },
    jumpSuccessMessage: `Jumped to editor: ${editorName}`,
    loggingDetails: { editorName, editorPath },
    ...rest,
  });
};
