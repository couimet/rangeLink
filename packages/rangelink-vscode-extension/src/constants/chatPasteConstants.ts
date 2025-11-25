/**
 * Constants for automatic paste to AI chat destinations
 */

/**
 * System-level paste commands to attempt when auto-pasting to chat interfaces.
 *
 * Ordered by reliability (most reliable first):
 * 1. editor.action.clipboardPasteAction - Standard VSCode editor paste
 * 2. execPaste - System-wide paste (more aggressive)
 * 3. paste - Generic fallback
 */
export const CHAT_PASTE_COMMANDS = [
  'editor.action.clipboardPasteAction',
  'execPaste',
  'paste',
] as const;

/**
 * Delay in milliseconds between focusing chat interface and attempting paste.
 *
 * Allows focus operation to complete before executing paste command.
 * Confirmed working at 200ms for both Claude Code and Cursor AI.
 */
export const FOCUS_TO_PASTE_DELAY_MS = 200;
