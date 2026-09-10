/**
 * File-path half shared by every parsed link form.
 *
 * Both `ParsedLink` (numeric anchors) and `ParsedTextLink` (text highlights)
 * begin by identifying a file; this base provides that path and its quoted
 * display form, and each concrete form then adds the locator that differs
 * (coordinates vs. a text directive). Consumers distinguish the concrete
 * forms with the `'directive' in parsed` narrowing.
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
