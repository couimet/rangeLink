import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { EligibleFile } from '../../types';

import { isFileEligible } from './isFileEligible';

/**
 * Get all files eligible for binding from open tab groups.
 *
 * Enumerates all tab groups, filters to text editor tabs with writable
 * schemes and non-binary extensions, and returns metadata for each.
 * Returns files in tab group order — sorting is a separate concern.
 *
 * Synchronous because tab enumeration doesn't require async resolution
 * (unlike terminals which need processId).
 *
 * @param ideAdapter - IDE adapter for reading tab group state
 * @returns Array of eligible files (empty if none qualify)
 */
export const getEligibleFiles = (ideAdapter: VscodeAdapter): EligibleFile[] => {
  const activeEditorUriString = ideAdapter.getActiveTextEditorUri()?.toString();
  const eligibleFiles: EligibleFile[] = [];

  for (const group of ideAdapter.tabGroups.all) {
    for (const tab of group.tabs) {
      const uri = ideAdapter.getTabDocumentUri(tab);
      if (uri === undefined) {
        continue;
      }

      if (!isFileEligible(uri.scheme, uri.fsPath)) {
        continue;
      }

      eligibleFiles.push({
        uri,
        filename: ideAdapter.getFilenameFromUri(uri),
        displayPath: ideAdapter.asRelativePath(uri, false),
        viewColumn: group.viewColumn,
        isCurrentInGroup: tab === group.activeTab,
        isActiveEditor:
          activeEditorUriString !== undefined && uri.toString() === activeEditorUriString,
      });
    }
  }

  return eligibleFiles;
};
