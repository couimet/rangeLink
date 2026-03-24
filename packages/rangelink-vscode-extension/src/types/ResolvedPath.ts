import type * as vscode from 'vscode';

import { PathFormat } from './PathFormat';

/**
 * Strategy used to resolve a file path to a workspace URI.
 *
 * Reuses PathFormat values for the standard strategies (absolute, workspace-relative)
 * and extends with resolution-only strategies that don't correspond to an input format.
 *
 * - `absolute`: Path was absolute and the file existed at that location
 * - `workspace-relative`: Path was resolved relative to a workspace folder
 * - `filename-fallback`: Bare filename (no directory separators) matched
 *    exactly one file in the workspace via glob search (Issue #342)
 */
export type PathResolutionStrategy = `${PathFormat}` | 'filename-fallback';

/**
 * Result of resolving a file path, including the URI and the strategy
 * that succeeded. Enables callers to log or adjust UI feedback based
 * on how the path was found.
 */
export interface ResolvedPath {
  uri: vscode.Uri;
  resolvedVia: PathResolutionStrategy;
}

/**
 * Sentinel value returned by resolveWorkspacePath when a bare filename
 * matches multiple files in the workspace. Callers use this to show
 * a distinct "multiple matches" warning instead of the generic "not found".
 */
export const FILENAME_AMBIGUOUS = 'filename-ambiguous' as const;

/**
 * Full return type of resolveWorkspacePath.
 *
 * - `ResolvedPath`: file found successfully
 * - `'filename-ambiguous'`: bare filename matched 2+ files (caller should warn about ambiguity)
 * - `undefined`: file not found by any strategy
 */
export type ResolveWorkspacePathResult = ResolvedPath | typeof FILENAME_AMBIGUOUS | undefined;
