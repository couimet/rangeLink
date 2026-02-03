import type * as vscode from 'vscode';

/**
 * Check if a single terminal is eligible for binding.
 *
 * A terminal is eligible if its process is still running (exitStatus undefined).
 * Terminals with terminated processes cannot receive input.
 *
 * @param terminal - VS Code terminal to check
 * @returns true if terminal has a live process, false if terminated
 */
export const isTerminalEligible = (terminal: vscode.Terminal): boolean =>
  terminal.exitStatus === undefined;
