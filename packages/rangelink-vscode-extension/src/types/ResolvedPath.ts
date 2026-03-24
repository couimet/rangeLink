import type * as vscode from 'vscode';

/**
 * Strategy used to resolve a file path to a workspace URI.
 *
 * - `absolute`: Path was absolute and the file existed at that location
 * - `workspace-relative`: Path was resolved relative to a workspace folder
 * - `filename-fallback`: Bare filename (no directory separators) matched
 *    exactly one file in the workspace via glob search (Issue #342)
 */
export type PathResolutionStrategy = 'absolute' | 'workspace-relative' | 'filename-fallback';

/**
 * Result of resolving a file path, including the URI and the strategy
 * that succeeded. Enables callers to log or adjust UI feedback based
 * on how the path was found.
 */
export interface ResolvedPath {
  uri: vscode.Uri;
  resolvedVia: PathResolutionStrategy;
}
