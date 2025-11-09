/**
 * Supported paste destination types
 *
 * - `terminal`: Active terminal (existing feature)
 * - `claude-code`: Claude Code chat input
 * - `cursor-ai`: Cursor AI assistant input
 */
export type DestinationType = 'terminal' | 'claude-code' | 'cursor-ai';

/**
 * Interface for RangeLink paste destinations
 *
 * Destinations are targets where generated RangeLinks can be automatically pasted.
 * All destinations follow the same contract: check availability, paste text, handle errors gracefully.
 *
 * Design principles:
 * - Async operations (chat destinations require command execution)
 * - Boolean return values (silent failure pattern, no throwing)
 * - Readonly properties (immutable after construction)
 */
export interface PasteDestination {
  /**
   * Unique identifier for this destination type
   */
  readonly id: DestinationType;

  /**
   * User-friendly display name shown in status messages and UI
   *
   * Examples: "Terminal", "Claude Code Chat", "Cursor AI Assistant"
   */
  readonly displayName: string;

  /**
   * Check if this destination is currently available for pasting
   *
   * Availability criteria vary by destination:
   * - Terminal: Must have bound terminal reference
   * - Claude Code: Extension must be installed and active
   * - Cursor AI: Must be running in Cursor IDE
   *
   * @returns Promise resolving to true if paste() can succeed, false otherwise
   */
  isAvailable(): Promise<boolean>;

  /**
   * Paste text to this destination with appropriate padding and focus
   *
   * Implementation requirements:
   * - Add padding if needed (smart padding: skip if already padded)
   * - Focus destination after paste (terminal.show(), chat.open(), etc.)
   * - Log success/failure for debugging
   * - Return false on failure (no throwing)
   *
   * @param text - The text to paste (typically a RangeLink)
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  paste(text: string): Promise<boolean>;
}
