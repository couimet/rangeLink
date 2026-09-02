import type { LinkRange, ResolveWorkspacePathResult } from '../types/ResolvedPath';

import { convertRangeLinkPosition } from './convertRangeLinkPosition';

import * as path from 'node:path';
import type * as vscode from 'vscode';

const AMBIGUITY_THRESHOLD = 2;
const MAX_FILENAME_CANDIDATES = 100;

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
 * 2. If path is a bare filename (no directory separators), first try the
 *    exact workspace-relative join — the bare name of a root-level file IS
 *    its relative path, so navigate there when it exists and the link range
 *    fits (or when no range is given). Otherwise search the workspace via
 *    findFiles: return the URI for a single match, return a candidate list
 *    for multiple matches
 * 3. Try resolving relative to each workspace folder
 * 4. If no workspace or file not found, return undefined
 *
 * Handles multi-folder workspaces by checking all workspace folders
 * in order until a matching file is found.
 *
 * @param linkPath - File path from RangeLink (may be relative or absolute)
 * @param ideInstance - VSCode module instance for workspace/URI operations
 * @param range - Optional link range used to validate that a root-file match fits before navigating
 * @returns ResolvedPath if found, FilenameCandidatesResult if multiple matches, undefined if not found
 */
export const resolveWorkspacePath = async (linkPath: string, ideInstance: typeof vscode, range?: LinkRange): Promise<ResolveWorkspacePathResult> => {
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

  // Bare-filename resolution: a root-level file's bare name IS its
  // workspace-relative path, so check the exact join first (range-aware).
  // Only when the root file is missing or the range clamps do we fall back
  // to the fuzzy glob search (Issue #342/#715).
  const isBareFilename = !linkPath.includes('/') && !linkPath.includes('\\');
  if (isBareFilename) {
    for (const folder of workspaceFolders) {
      const absolutePath = path.join(folder.uri.fsPath, linkPath);
      const uri = ideInstance.Uri.file(absolutePath);
      try {
        await ideInstance.workspace.fs.stat(uri);
      } catch {
        continue; // file doesn't exist at this folder's root
      }
      if (range === undefined) {
        return { uri, resolvedVia: 'workspace-relative' };
      }
      let doc: vscode.TextDocument;
      try {
        doc = await ideInstance.workspace.openTextDocument(uri);
      } catch {
        break; // cannot validate the range — let the user pick from all matches
      }
      const startConverted = convertRangeLinkPosition(range.start, doc);
      const endConverted = convertRangeLinkPosition(range.end, doc);
      const anyClamping = startConverted.lineClamped || startConverted.characterClamped || endConverted.lineClamped || endConverted.characterClamped;
      if (!anyClamping) {
        return { uri, resolvedVia: 'workspace-relative' };
      }
      break; // range would clamp — let the user pick from all matches
    }

    const pattern = `**/${escapeGlobPattern(linkPath)}`;
    try {
      const matches = await ideInstance.workspace.findFiles(pattern, undefined, MAX_FILENAME_CANDIDATES);
      if (matches.length === 1) {
        return { uri: matches[0], resolvedVia: 'filename-fallback' };
      }
      if (matches.length >= AMBIGUITY_THRESHOLD) {
        return { candidates: matches };
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
