import * as path from 'path';
import * as vscode from 'vscode';

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
 * @returns File URI if found, undefined otherwise
 *
 * @example
 * ```typescript
 * // Workspace-relative path
 * const uri = await resolveWorkspacePath('src/auth.ts');
 * // => file:///Users/name/project/src/auth.ts
 *
 * // Absolute path
 * const uri = await resolveWorkspacePath('/Users/name/project/src/auth.ts');
 * // => file:///Users/name/project/src/auth.ts
 *
 * // File not found
 * const uri = await resolveWorkspacePath('nonexistent.ts');
 * // => undefined
 * ```
 */
export const resolveWorkspacePath = async (linkPath: string): Promise<vscode.Uri | undefined> => {
  // Try as absolute path first
  if (path.isAbsolute(linkPath)) {
    const uri = vscode.Uri.file(linkPath);
    try {
      await vscode.workspace.fs.stat(uri);
      return uri;
    } catch {
      // File doesn't exist at absolute path, try workspace resolution
    }
  }

  // Try resolving relative to each workspace folder
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }

  for (const folder of workspaceFolders) {
    const absolutePath = path.join(folder.uri.fsPath, linkPath);
    const uri = vscode.Uri.file(absolutePath);

    try {
      await vscode.workspace.fs.stat(uri);
      return uri;
    } catch {
      // File doesn't exist in this workspace folder, try next
      continue;
    }
  }

  // File not found in any workspace folder
  return undefined;
};
