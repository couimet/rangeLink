/**
 * Constants for automatic paste to AI chat destinations.
 */

/**
 * Delay between focusing a chat interface and attempting paste, for a panel
 * that is already visible (warm). The shorter delay is sufficient because
 * the webview context is retained (retainContextWhenHidden) and the input
 * just needs a brief moment to regain focus.
 */
export const FOCUS_TO_PASTE_DELAY_MS = 200;

/**
 * Delay after a successful clipboard paste command before allowing the
 * outer ClipboardPreserver to restore the user's prior clipboard. Webview-based
 * AI assistants (Claude Code) read from the system clipboard
 * asynchronously across the Electron IPC boundary — this delay keeps the
 * RangeLink on the clipboard until the webview's paste handler completes.
 */
export const CLIPBOARD_POST_PASTE_DELAY_MS = 200;
