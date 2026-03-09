/**
 * Arguments for file path link click handlers.
 *
 * Used by the document link provider to pass the matched file path
 * to the click handler command.
 *
 * **Properties:**
 * - `filePath`: The file path string detected in the document (e.g., "/path/to/file.ts")
 */
export interface FilePathClickArgs {
  /**
   * The file path string detected in the document.
   *
   * This is the raw matched string from the document text.
   * The navigation handler resolves it to an absolute URI on click.
   */
  filePath: string;
}
