import { PathFormat } from './PathFormat';

import type { LinkPosition } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

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
 * Start and end positions from a parsed RangeLink, used to validate that a
 * link range fits a candidate file before navigating. Positions are
 * 1-indexed in link format.
 */
export interface LinkRange {
  start: LinkPosition;
  end: LinkPosition;
}

/**
 * Bare filename matched multiple files and none could be chosen
 * deterministically. Callers should present the candidates (e.g. a QuickPick)
 * and let the user pick which file to navigate to.
 */
export interface FilenameCandidatesResult {
  candidates: vscode.Uri[];
}

/**
 * Full return type of resolveWorkspacePath.
 *
 * - `ResolvedPath`: file found successfully
 * - `FilenameCandidatesResult`: bare filename matched 2+ files (caller should let the user pick)
 * - `undefined`: file not found by any strategy
 */
export type ResolveWorkspacePathResult = ResolvedPath | FilenameCandidatesResult | undefined;
