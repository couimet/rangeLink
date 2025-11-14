import type { FormattedLink } from 'rangelink-core-ts';

/**
 * Supported paste destination types
 *
 * - `terminal`: Active terminal (existing feature)
 * - `text-editor`: Active text editor at cursor position (future)
 * - `cursor-ai`: Cursor AI assistant input (future)
 * - `github-copilot`: GitHub Copilot Chat (future)
 * - `claude-code`: Claude Code chat (experimental - hybrid approach, see docs/RESEARCH-CLAUDE-CODE-INTEGRATION-UPDATE.md)
 */
export type DestinationType =
  | 'terminal'
  | 'text-editor'
  | 'cursor-ai'
  | 'github-copilot'
  | 'claude-code';

/**
 * Interface for RangeLink paste destinations
 *
 * Destinations are targets where generated RangeLinks can be automatically pasted.
 * All destinations follow the same contract: check availability, paste text, handle errors gracefully.
 *
 * Design principles:
 * - Async operations (AI assistant destinations require command execution)
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
   * Examples: "Terminal", "Text Editor", "Cursor AI Assistant", "GitHub Copilot Chat", "Claude Code Chat"
   */
  readonly displayName: string;

  /**
   * Check if this destination is currently available for pasting
   *
   * Availability criteria vary by destination:
   * - Terminal: Must have bound terminal reference
   * - Text Editor: Must have active text editor with cursor position
   * - Cursor AI: Must be running in Cursor IDE
   * - GitHub Copilot: Extension must be installed and active
   * - Claude Code: Extension must be installed and active
   *
   * @returns Promise resolving to true if pasteLink() can succeed, false otherwise
   */
  isAvailable(): Promise<boolean>;

  /**
   * Paste a RangeLink to this destination with appropriate padding and focus
   *
   * Implementation requirements:
   * - Add padding if needed (smart padding: skip if already padded)
   * - Focus destination after paste (terminal.show(), chat.open(), etc.)
   * - Log success/failure for debugging
   * - Return false on failure (no throwing)
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  pasteLink(formattedLink: FormattedLink): Promise<boolean>;
}
