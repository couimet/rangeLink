import type * as vscode from 'vscode';

import type { PasteDestination } from '../destinations/PasteDestination';

/**
 * Check if paste would go to the same file as the source.
 *
 * @param sourceUri - URI of the source document
 * @param destination - The bound paste destination
 * @returns true if source and destination are the same file
 */
export const isSelfPaste = (
  sourceUri: vscode.Uri,
  destination: PasteDestination | undefined,
): boolean => {
  if (!destination) return false;

  const destUri = destination.getDestinationUri();
  if (!destUri) return false;

  return sourceUri.toString() === destUri.toString();
};
