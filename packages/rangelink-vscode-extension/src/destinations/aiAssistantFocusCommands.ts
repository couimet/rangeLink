/**
 * Focus commands for AI assistant destinations.
 *
 * Each array contains primary + fallback commands used by CommandFocusManager
 * to focus the AI assistant panel before clipboard paste.
 */

export const CURSOR_AI_FOCUS_COMMANDS = [
  'aichat.newchataction', // Primary: Cursor-specific command (Cmd+L / Ctrl+L)
  'workbench.action.toggleAuxiliaryBar', // Fallback: Toggle secondary sidebar
];

export const CLAUDE_CODE_FOCUS_COMMANDS = [
  'claude-vscode.focus', // Primary: Direct input focus (Cmd+Escape)
  'claude-vscode.sidebar.open', // Fallback: Open sidebar
  'claude-vscode.editor.open', // Fallback: Open in new tab
];

export const GITHUB_COPILOT_CHAT_FOCUS_COMMANDS = [
  'workbench.action.chat.open', // Primary: Opens/focuses the chat view
  'workbench.panel.chat.view.copilot.focus', // Fallback: Direct panel focus
];
