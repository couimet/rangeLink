import type * as vscode from 'vscode';

/**
 * Discriminator for QuickPick items across all RangeLink menus.
 * Used to identify item type after user selection.
 */
export type PickerItemKind = 'terminal' | 'terminal-more';

/**
 * Base QuickPickItem with RangeLink discriminator.
 * All selectable QuickPick items should extend this.
 */
export interface BaseQuickPickItem extends vscode.QuickPickItem {
  readonly itemKind: PickerItemKind;
}

// ============================================================================
// Terminal Picker Types
// ============================================================================

/**
 * QuickPickItem representing a terminal in the terminal picker.
 */
export interface TerminalQuickPickItem extends BaseQuickPickItem {
  readonly itemKind: 'terminal';
  readonly terminal: vscode.Terminal;
}

/**
 * QuickPickItem representing the "More terminals..." overflow trigger.
 */
export interface TerminalMoreQuickPickItem extends BaseQuickPickItem {
  readonly itemKind: 'terminal-more';
  readonly displayName: string;
  readonly remainingCount: number;
}
