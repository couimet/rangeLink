/**
 * Constants for automatic paste to AI assistant destinations.
 *
 * Used by both built-in AI assistants (Claude Code, Cursor AI, GitHub Copilot Chat)
 * and custom AI assistants (Tier 1 direct insert, Tier 2 focus-and-paste). Tier 3
 * manual-paste flows do not use these constants.
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
 * outer ClipboardService to restore the user's prior clipboard. Webview-based
 * AI assistants (Claude Code) read from the system clipboard
 * asynchronously across the Electron IPC boundary — this delay keeps the
 * RangeLink on the clipboard until the webview's paste handler completes.
 */
export const CLIPBOARD_POST_PASTE_DELAY_MS = 200;

/**
 * System paste commands to attempt when dispatching a clipboard paste into an
 * AI assistant surface. Tried in order; first successful dispatch wins.
 *
 * Order is significant — different commands reach different focused surfaces:
 *
 * 1. `editor.action.clipboardPasteAction` — VS Code editor paste. Reaches a
 *    standard text editor when one has focus. Cheap and the natural first
 *    attempt, but does NOT reach webview-hosted inputs.
 * 2. `execPaste` — system-level paste dispatch. Reaches webview-hosted inputs
 *    (chat panels for built-in AI assistants and custom AI webview targets)
 *    that the editor-scoped command does not touch.
 * 3. `paste` — generic fallback for VS Code surfaces that expose a `paste`
 *    command but aren't reached by either of the above.
 *
 * Webview-hosted AI assistant inputs typically resolve via #2; #1 may succeed
 * when an editor happens to retain focus, in which case the paste lands in the
 * editor rather than the AI panel. Keeping #1 first is still correct: in
 * editor-target paths it's the right call, and the focus pipeline is responsible
 * for parking focus inside the AI panel before this loop runs, so #1 typically
 * throws (no editor focused) and the loop falls through to #2.
 */
export const AI_ASSISTANT_PASTE_COMMANDS = [
  'editor.action.clipboardPasteAction',
  'execPaste',
  'paste',
] as const;
