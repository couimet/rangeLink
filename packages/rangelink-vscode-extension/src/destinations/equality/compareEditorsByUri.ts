import type * as vscode from 'vscode';

import type { PasteDestination } from '../PasteDestination';

/**
 * Compare two text editors by their document URIs.
 *
 * Used for destination equality checks in editor-based paste destinations.
 * Document URIs uniquely identify editor instances across VSCode sessions.
 *
 * @param thisEditor - The editor from the current destination
 * @param other - The destination to compare against
 * @returns Promise resolving to true if both editors have matching document URIs
 */
export const compareEditorsByUri = async (
  thisEditor: vscode.TextEditor,
  other: PasteDestination,
): Promise<boolean> => {
  const otherEditor = (other as any).editor;
  if (!otherEditor) {
    return false;
  }

  return thisEditor.document.uri.toString() === otherEditor.document.uri.toString();
};
