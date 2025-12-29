import type { FormattedLink } from 'rangelink-core-ts';

import type { AutoPasteResult } from '../types/AutoPasteResult';
import type { PaddingMode } from '../utils/applySmartPadding';

/**
 * All supported paste destination type identifiers
 *
 * Single source of truth - DestinationType is derived from this array.
 * Keep in alphabetical order for maintainability.
 */
export const DESTINATION_TYPES = [
  'claude-code',
  'cursor-ai',
  'github-copilot-chat',
  'terminal',
  'text-editor',
] as const;

/**
 * Supported paste destination types (derived from DESTINATION_TYPES array)
 */
export type DestinationType = (typeof DESTINATION_TYPES)[number];

/**
 * AI assistant destination types (subset of DestinationType)
 *
 * These destinations require extension availability checks rather than
 * resource binding (like terminal or text-editor).
 */
export type AIAssistantDestinationType = Extract<
  DestinationType,
  'claude-code' | 'cursor-ai' | 'github-copilot-chat'
>;

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
   * - Apply padding based on provided paddingMode
   * - Focus destination after paste (terminal.show(), chat.open(), etc.)
   * - Log success/failure for debugging
   * - Return false on failure or ineligibility (no throwing)
   *
   * @param formattedLink - The formatted RangeLink with metadata
   * @param paddingMode - How to apply smart padding (both, before, after, none)
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  pasteLink(formattedLink: FormattedLink, paddingMode: PaddingMode): Promise<boolean>;

  /**
   * Paste text content to this destination with appropriate padding and focus
   *
   * Used for pasting selected text directly to bound destinations (issue #89).
   * Unlike pasteLink(), this accepts raw text content without link formatting.
   *
   * Implementation requirements:
   * - Check eligibility internally (defensive programming)
   * - Apply padding based on provided paddingMode
   * - Focus destination after paste (terminal.show(), chat.open(), etc.)
   * - Log success/failure for debugging
   * - Return false on failure or ineligibility (no throwing)
   *
   * @param content - The text content to paste
   * @param paddingMode - How to apply smart padding (both, before, after, none)
   * @returns Promise resolving to true if paste succeeded, false otherwise
   */
  pasteContent(content: string, paddingMode: PaddingMode): Promise<boolean>;

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
   * @param autoPasteResult - Result of the automatic paste attempt
   * @returns Instruction string for manual paste, or undefined for automatic paste
   */
  getUserInstruction(autoPasteResult: AutoPasteResult): string | undefined;

  /**
   * Focus this destination without performing a paste operation
   *
   * Provides a way to quickly navigate back to the bound destination.
   * Each destination implements its own focus logic:
   * - Terminal: Shows the terminal panel
   * - Text Editor: Focuses the editor document
   * - AI Assistants: Opens/focuses the chat interface
   *
   * Used by the "Jump to Bound Destination" command (issue #99).
   *
   * @returns Promise resolving to true if focus succeeded, false otherwise
   */
  focus(): Promise<boolean>;

  /**
   * Get success message for jump command
   *
   * Returns a formatted i18n message to display in the status bar when
   * the user successfully jumps to this destination. Each destination
   * provides its own context-appropriate message.
   *
   * Eliminates type-checking in PasteDestinationManager by encapsulating
   * destination-specific message formatting within each implementation.
   *
   * @returns Formatted success message for status bar display
   */
  getJumpSuccessMessage(): string;

  /**
   * Get destination-specific details for logging
   *
   * Returns structured data about this destination for debug/info logging.
   * Eliminates type-checking in PasteDestinationManager by encapsulating
   * destination-specific details within each implementation.
   *
   * Examples:
   * - Terminal: { terminalName: "bash" }
   * - Text Editor: { editorName: "src/file.ts", editorPath: "/absolute/path" }
   * - AI Assistants: {} (no additional details needed)
   *
   * @returns Record with destination-specific logging details (empty object if none)
   */
  getLoggingDetails(): Record<string, unknown>;

  /**
   * Check if this destination equals another destination
   *
   * @param other - The destination to compare against (may be undefined)
   * @returns Promise<true> if same destination, Promise<false> otherwise
   */
  equals(other: PasteDestination | undefined): Promise<boolean>;
}
