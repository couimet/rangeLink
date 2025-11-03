/**
 * Specifies whether to use relative or absolute file paths in generated links.
 * - WorkspaceRelative: Path relative to workspace root (e.g., src/file.ts)
 * - Absolute: Full filesystem path (e.g., /Users/name/project/src/file.ts)
 */
export enum PathFormat {
  WorkspaceRelative = 'WorkspaceRelative',
  Absolute = 'Absolute',
}
