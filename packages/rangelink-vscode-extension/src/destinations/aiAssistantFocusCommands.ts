/**
 * Focus stages for AI assistant destinations.
 *
 * Each export is an OR of ANDs: the outer array lists stages in fallback
 * order, and each stage (inner array) is a sequence of commands that must
 * ALL run. Focus tries the first stage; if any command in it throws, the
 * stage fails and focus advances to the next stage. A stage that runs every
 * command to completion wins.
 *
 * Used by CommandFocusManager to focus the AI assistant panel before
 * clipboard paste.
 */

export const CURSOR_AI_FOCUS_COMMANDS = [
  ['aichat.newchataction'], // Primary: Cursor-specific command (Cmd+L / Ctrl+L)
  ['workbench.action.toggleAuxiliaryBar'], // Fallback: Toggle secondary sidebar
];

export const CLAUDE_CODE_FOCUS_COMMANDS = [
  ['claude-vscode.focus'], // Primary: Direct input focus (Cmd+Escape)
  ['claude-vscode.sidebar.open'], // Fallback: Open sidebar
  ['claude-vscode.editor.open'], // Fallback: Open in new tab
];

export const CLINE_FOCUS_COMMANDS = [
  // Primary: open the sidebar (ensures the webview exists) then focus its input.
  // focusChatInput only lands once the webview is present; the cold-refocus
  // loop re-fires this stage so a still-loading webview gets focused on retry.
  ['claude-dev.SidebarProvider.focus', 'cline.focusChatInput'],
  // Legacy Cline (no focusChatInput command): open the panel only.
  ['claude-dev.SidebarProvider.focus'],
];

export const GEMINI_CODE_ASSIST_FOCUS_COMMANDS = [
  ['cloudcode.gemini.chatView.focus'], // google.geminicodeassist extension ≥ 2.79
];

export const GITHUB_COPILOT_CHAT_FOCUS_COMMANDS = [
  ['workbench.action.chat.open'], // Primary: Opens/focuses the chat view
  ['workbench.panel.chat.view.copilot.focus'], // Fallback: Direct panel focus
];
