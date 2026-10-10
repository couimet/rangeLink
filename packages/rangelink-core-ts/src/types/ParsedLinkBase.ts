/**
 * File-path half of a parsed numeric link.
 *
 * `ParsedLink` begins by identifying a file; this base provides that path and
 * its quoted display form, and the concrete type then adds the locator that
 * differs (coordinates). Text fragment links carry their own path field in
 * `text-fragment-ts` rather than extending this base.
 */
export interface ParsedLinkBase {
  /**
   * File path extracted from the link (always raw/unquoted).
   * May be relative (e.g., "src/file.ts") or absolute (e.g., "/Users/name/project/file.ts").
   *
   * Use for filesystem operations — this is the semantic path.
   */
  path: string;

  /**
   * The path wrapped in single quotes when it contains unsafe characters.
   *
   * When safe: `quotedPath === path` (e.g., `"src/file.ts"`)
   * When unsafe: path is quoted (e.g., `"'My Folder/file.ts'"`)
   *
   * Provides API symmetry with FormattedLink's `link`/`rawLink` duality.
   */
  quotedPath: string;
}
