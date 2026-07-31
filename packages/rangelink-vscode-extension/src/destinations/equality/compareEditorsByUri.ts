import { isEditorDestination } from '../../utils';
import type { PasteDestination } from '../PasteDestination';

import type * as vscode from 'vscode';

/**
 * Compare an editor destination by URI.
 *
 * Used for destination equality checks in editor-based paste destinations.
 * Document URIs uniquely identify editor instances across VSCode sessions.
 *
 * @param uri - The URI of the current destination
 * @param other - The destination to compare against
 * @returns Promise resolving to true if both destinations have matching URIs
 */
export const compareEditorsByUri = (uri: vscode.Uri, other: PasteDestination): Promise<boolean> => {
  if (!isEditorDestination(other)) {
    return Promise.resolve(false);
  }

  return Promise.resolve(uri.toString() === other.resource.uri.toString());
};
