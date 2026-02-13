import type * as vscode from 'vscode';

/**
 * Check if a terminal is hidden from the user via creationOptions.
 *
 * Terminals created with `hideFromUser: true` are not shown in the Terminal panel
 * but ARE exposed to extensions via `vscode.window.terminals`. These are internal
 * IDE terminals (e.g., Cursor's background terminal) that users never interact with.
 *
 * @param terminal - VS Code terminal to check
 * @returns true if terminal has hideFromUser set to true
 */
const isHiddenFromUser = (terminal: vscode.Terminal): boolean =>
  'hideFromUser' in terminal.creationOptions &&
  (terminal.creationOptions as vscode.TerminalOptions).hideFromUser === true;

/**
 * Check if a single terminal is eligible for binding.
 *
 * A terminal is eligible when:
 * - Its process is still running (exitStatus undefined)
 * - It is not hidden from the user (hideFromUser is not true)
 *
 * Terminals with terminated processes cannot receive input.
 * Hidden terminals are internal IDE terminals not visible in the Terminal panel.
 *
 * @param terminal - VS Code terminal to check
 * @returns true if terminal is live and user-visible, false otherwise
 */
export const isTerminalEligible = (terminal: vscode.Terminal): boolean =>
  terminal != null && terminal.exitStatus === undefined && !isHiddenFromUser(terminal);
