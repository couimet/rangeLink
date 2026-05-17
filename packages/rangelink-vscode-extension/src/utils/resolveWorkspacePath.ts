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
 * 2. If path is a bare filename (no directory separators), search workspace
 *    via findFiles — return the URI only when exactly one match exists,
 *    return FILENAME_AMBIGUOUS when multiple matches exist
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

  // Bare-filename resolution: if the path has no directory separators,
  // use findFiles to check for ambiguity BEFORE the workspace-relative
  // loop — otherwise a root-level match would silently win (Issue #342)
  const isBareFilename = !linkPath.includes('/') && !linkPath.includes('\\');
  if (isBareFilename) {
    const pattern = `**/${escapeGlobPattern(linkPath)}`;
    try {
      const matches = await ideInstance.workspace.findFiles(
        pattern,
        undefined,
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
