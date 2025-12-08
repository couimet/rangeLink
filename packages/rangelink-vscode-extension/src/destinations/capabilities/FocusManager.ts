import type { LoggingContext } from 'barebone-logger';

/**
 * Manages destination focus before paste operation.
 *
 * Used by:
 * - Destinations that need to ensure focus before pasting (Terminal, TextEditor, etc.)
 */
export interface FocusManager {
  /**
   * Focus the destination before paste.
   *
   * @param context - Logging context with function name and metadata
   * @returns Promise<void> - Completes when focus is achieved or attempted
   *
   * Implementations should:
   * - Show/focus the destination UI element
   * - Wait for any necessary delays (e.g., animation completion)
   * - Log focus attempts and results
   * - Handle focus failures gracefully (log but don't throw)
   */
  focus(context: LoggingContext): Promise<void>;
}
