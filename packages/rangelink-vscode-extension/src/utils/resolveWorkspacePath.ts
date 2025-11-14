import * as path from 'node:path';

import type * as vscode from 'vscode';

/**
 * Resolve a file path from a RangeLink to an absolute file URI.
 *
 * Attempts to resolve the path in the following order:
 * 1. If path is absolute and exists, use it directly
 * 2. Try resolving relative to each workspace folder
 * 3. If no workspace or file not found, return undefined
 *
 * Handles multi-folder workspaces by checking all workspace folders
 * in order until a matching file is found.
 *
 * @param linkPath - File path from RangeLink (may be relative or absolute)
 * @param ideInstance - VSCode module instance for workspace/URI operations
 * @returns File URI if found, undefined otherwise
 */
export const resolveWorkspacePath = async (
  linkPath: string,
  ideInstance: typeof vscode,
): Promise<vscode.Uri | undefined> => {

  // Try as absolute path first
  if (path.isAbsolute(linkPath)) {
    const uri = ideInstance.Uri.file(linkPath);
    try {
      await ideInstance.workspace.fs.stat(uri);
      return uri;
    } catch {
      // File doesn't exist at absolute path, try workspace resolution
    }
  }

  // Try resolving relative to each workspace folder
  const workspaceFolders = ideInstance.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }

  for (const folder of workspaceFolders) {
    const absolutePath = path.join(folder.uri.fsPath, linkPath);
    const uri = ideInstance.Uri.file(absolutePath);

    try {
      await ideInstance.workspace.fs.stat(uri);
      return uri;
    } catch {
      // File doesn't exist in this workspace folder, try next
      continue;
    }
  }

  // File not found in any workspace folder
  return undefined;
};
