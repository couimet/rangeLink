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
   * Check if a RangeLink is eligible to be pasted to this destination
   *
   * Determines if pasting should be skipped based on destination-specific rules.
   * Examples:
   * - TextEditorDestination: Skip if creating link FROM the bound editor itself
   * - Other destinations: Always eligible (return true)
   *
   * This check is separate from isAvailable() which verifies infrastructure readiness.
   * Eligibility is about business logic (should we paste?), availability is about
   * technical capability (can we paste?).
   *
   * @param formattedLink - The formatted RangeLink to check
   * @returns Promise resolving to true if paste should proceed, false to skip
   */
  isEligibleForPasteLink(formattedLink: FormattedLink): Promise<boolean>;

  /**
   * Check if text content is eligible to be pasted to this destination
   *
   * Similar to isEligibleForPasteLink() but for raw text content (issue #89).
   * Most destinations always return true for content, but TextEditorDestination
   * may have specific rules (e.g., skip if content is empty).
   *
   * @param content - The text content to check
   * @returns Promise resolving to true if paste should proceed, false to skip
   */
  isEligibleForPasteContent(content: string): Promise<boolean>;

  /**
   * Paste a RangeLink to this destination with appropriate padding and focus
   *
   * Implementation requirements:
   * - Check eligibility internally (defensive programming)
   * - Add padding if needed (smart padding: skip if already padded)
   * - Focus destination after paste (terminal.show(), chat.open(), etc.)
   * - Log success/failure for debugging
   * - Return false on failure or ineligibility (no throwing)
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  pasteLink(formattedLink: FormattedLink): Promise<boolean>;

  /**
   * Paste text content to this destination with appropriate padding and focus
   *
   * Used for pasting selected text directly to bound destinations (issue #89).
   * Unlike pasteLink(), this accepts raw text content without link formatting.
   *
   * Implementation requirements:
   * - Check eligibility internally (defensive programming)
   * - Add padding if needed (smart padding: skip if already padded)
   * - Focus destination after paste (terminal.show(), chat.open(), etc.)
   * - Log success/failure for debugging
   * - Return false on failure or ineligibility (no throwing)
   *
   * @param content - The text content to paste
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  pasteContent(content: string): Promise<boolean>;

  /**
   * Get user instruction for manual paste action (clipboard-based destinations only)
   *
   * Clipboard-based destinations (Claude Code, Cursor AI) cannot programmatically
   * insert content into their chat interfaces. They copy to clipboard and require
   * the user to manually paste. This method returns the instruction string to show
   * the user in a popup toast.
   *
   * Automatic destinations (Terminal, Text Editor) return undefined since no manual
   * action is required.
   *
   * @returns Instruction string for manual paste, or undefined for automatic paste
   */
  getUserInstruction(): string | undefined;
}
