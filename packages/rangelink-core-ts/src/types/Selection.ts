/**
 * Pure domain representation of a text selection.
 * Uses 0-based indexing for lines and characters.
 *
 * This is an Anti-Corruption Layer (ACL) that decouples the core domain
 * from IDE-specific types like vscode.Selection.
 */
export interface Selection {
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;
}
