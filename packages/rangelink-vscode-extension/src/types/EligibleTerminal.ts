import type * as vscode from 'vscode';

/**
 * Information about a terminal eligible for binding.
 * Includes the raw terminal reference, display name, and active state.
 */
export interface EligibleTerminal {
  readonly terminal: vscode.Terminal;
  readonly name: string;
  readonly isActive: boolean;
}
