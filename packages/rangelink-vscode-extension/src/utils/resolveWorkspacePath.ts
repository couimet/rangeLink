import * as path from 'node:path';

import type * as vscode from 'vscode';

import { FILENAME_AMBIGUOUS } from '../types/ResolvedPath';
import type { ResolveWorkspacePathResult } from '../types/ResolvedPath';

const AMBIGUITY_THRESHOLD = 2;

const GLOB_METACHARACTERS: ReadonlyMap<string, string> = new Map([
  ['[', '[[]'],
  [']', '[]]'],
  ['*', '[*]'],
  ['?', '[?]'],
  ['{', '[{]'],
  ['}', '[}]'],
]);

const escapeGlobPattern = (filename: string): string => {
  let escaped = '';
  for (const char of filename) {
    escaped += GLOB_METACHARACTERS.get(char) ?? char;
  }
  return escaped;
};

/**
 * Resolve a file path from a RangeLink to an absolute file URI.
 *
 * Attempts to resolve the path in the following order:
 * 1. If path is absolute and exists, use it directly
 * 2. If path is a bare filename (no directory separators):
 *    a. Check workspace root(s) via fs.stat — return match if exactly one root has it
 *    b. If multiple roots have it, return FILENAME_AMBIGUOUS
 *    c. Fall back to findFiles across workspace (node_modules excluded) to check uniqueness
 * 3. Try resolving relative to each workspace folder
 * 4. If no workspace or file not found, return undefined
 *
 * Handles multi-folder workspaces by checking all workspace folders
 * in order until a matching file is found.
 *
 * @param linkPath - File path from RangeLink (may be relative or absolute)
 * @param ideInstance - VSCode module instance for workspace/URI operations
 * @returns ResolvedPath if found, 'filename-ambiguous' if multiple matches, undefined if not found
 */
export const resolveWorkspacePath = async (
  linkPath: string,
  ideInstance: typeof vscode,
): Promise<ResolveWorkspacePathResult> => {
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

  const workspaceFolders = ideInstance.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }

  // Bare-filename resolution: check workspace root(s) first via fs.stat,
  // then fall back to findFiles with node_modules excluded (Issue #541).
  const isBareFilename = !linkPath.includes('/') && !linkPath.includes('\\');
  if (isBareFilename) {
    let rootMatchCount = 0;
    let rootMatch: vscode.Uri | undefined;
    for (const folder of workspaceFolders) {
      const rootPath = path.join(folder.uri.fsPath, linkPath);
      const rootUri = ideInstance.Uri.file(rootPath);
      try {
        await ideInstance.workspace.fs.stat(rootUri);
        rootMatchCount++;
        rootMatch = rootUri;
      } catch {
        // Not at this root
      }
    }
    if (rootMatchCount === 1) {
      return { uri: rootMatch!, resolvedVia: 'workspace-relative' };
    }
    if (rootMatchCount >= AMBIGUITY_THRESHOLD) {
      return FILENAME_AMBIGUOUS;
    }

    const pattern = `**/${escapeGlobPattern(linkPath)}`;
    try {
      const matches = await ideInstance.workspace.findFiles(
        pattern,
        '{**/node_modules/**}',
        AMBIGUITY_THRESHOLD,
      );
      if (matches.length === 1) {
        return { uri: matches[0], resolvedVia: 'filename-fallback' };
      }
      if (matches.length >= AMBIGUITY_THRESHOLD) {
        return FILENAME_AMBIGUOUS;
      }
    } catch {
      // findFiles failed — fall through to undefined
    }
    return undefined;
  }

  // Try resolving relative to each workspace folder
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

  return undefined;
};
