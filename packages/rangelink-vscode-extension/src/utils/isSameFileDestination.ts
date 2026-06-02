import type * as vscode from 'vscode';

import type { PasteDestination } from '../destinations';

/**
 * Check if paste would go to the same file as the source, accounting for view columns.
 *
 * When the same file is open in multiple view columns, each column is an independent
 * editor instance. Self-paste prevention does not apply across columns since the
 * source selection and destination cursor are in separate editor instances.
 *
 * @param sourceUri - URI of the source document
 * @param destination - The bound paste destination
 * @param sourceViewColumn - Optional view column of the source editor
 * @returns true if source and destination are the same file AND same view column
 */
export const isSameFileDestination = (
  sourceUri: vscode.Uri,
  destination: PasteDestination | undefined,
  sourceViewColumn?: vscode.ViewColumn,
): boolean => {
  if (!destination) return false;

  const destUri = destination.getDestinationUri();
  if (!destUri) return false;

  if (sourceUri.toString() !== destUri.toString()) return false;

  const destViewColumn = destination.getDestinationViewColumn?.();
  if (sourceViewColumn !== undefined && destViewColumn !== undefined) {
    return sourceViewColumn === destViewColumn;
  }

  return true;
};
