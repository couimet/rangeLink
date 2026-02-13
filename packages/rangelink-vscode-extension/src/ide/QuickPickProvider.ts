import type * as vscode from 'vscode';

/**
 * Narrow interface for components that only need quick pick functionality.
 *
 * Avoids coupling showTerminalPicker and DestinationPicker to the full VscodeAdapter.
 */
export interface QuickPickProvider {
  showQuickPick<T extends vscode.QuickPickItem>(
    items: T[],
    options?: vscode.QuickPickOptions,
  ): Promise<T | undefined>;
}
