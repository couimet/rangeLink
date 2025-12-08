import type { LoggingContext } from 'barebone-logger';

/**
 * Strategy for inserting text into a destination.
 *
 * Different destinations use different insertion mechanisms:
 * - Terminal: Clipboard-based paste to avoid line wrapping issues
 * - TextEditor: Direct cursor insertion via VSCode API
 * - Clipboard-based chat: Copy + paste commands
 * - Native API chat: Command parameter injection
 */
export interface TextInserter {
  /**
   * Insert text into destination.
   *
   * @param text - Text to insert (pre-padded by caller)
   * @param context - Logging context with function name and metadata
   * @returns Promise<boolean> - true if insertion succeeded, false if failed
   *
   * Implementations should:
   * - Return true on successful insertion
   * - Return false on failure (no exceptions for control flow)
   * - Log success/failure at appropriate levels (info for success, debug for retries)
   * - Include context-specific details in logs (command used, error encountered, etc.)
   */
  insert(text: string, context: LoggingContext): Promise<boolean>;
}
