import * as path from 'node:path';

import type * as vscode from 'vscode';

import type { ResolvedPath } from '../types/ResolvedPath';

const AMBIGUITY_THRESHOLD = 2;

/**
 * Resolve a file path from a RangeLink to an absolute file URI.
 *
 * Attempts to resolve the path in the following order:
 * 1. If path is absolute and exists, use it directly
 * 2. Try resolving relative to each workspace folder
 * 3. If path is a bare filename (no directory separators), search workspace
 *    via findFiles — return the URI only when exactly one match exists
 * 4. If no workspace or file not found, return undefined
 *
 * Handles multi-folder workspaces by checking all workspace folders
 * in order until a matching file is found.
 *
 * @param linkPath - File path from RangeLink (may be relative or absolute)
 * @param ideInstance - VSCode module instance for workspace/URI operations
 * @returns ResolvedPath with URI and resolution strategy if found, undefined otherwise
 */
export const resolveWorkspacePath = async (
  linkPath: string,
  ideInstance: typeof vscode,
): Promise<ResolvedPath | undefined> => {
  // Try as absolute path first
  if (path.isAbsolute(linkPath)) {
    const uri = ideInstance.Uri.file(linkPath);
    try {
      await ideInstance.workspace.fs.stat(uri);
      return { uri, resolvedVia: 'absolute' };
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
      return { uri, resolvedVia: 'workspace-relative' };
    } catch {
      // File doesn't exist in this workspace folder, try next
      continue;
    }
  }

  // Bare-filename fallback: if the path has no directory separators,
  // search the workspace for a unique match (Issue #342)
  const isBareFilename = !linkPath.includes('/') && !linkPath.includes('\\');
  if (isBareFilename) {
    const pattern = `**/${linkPath}`;
    try {
      const matches = await ideInstance.workspace.findFiles(pattern, undefined, AMBIGUITY_THRESHOLD);
      if (matches.length === 1) {
        return { uri: matches[0], resolvedVia: 'filename-fallback' };
      }
    } catch {
      // findFiles failed (e.g., no workspace open) — fall through to undefined
    }
  }

  return undefined;
};
