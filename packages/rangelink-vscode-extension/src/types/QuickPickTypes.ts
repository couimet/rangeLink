import type * as vscode from 'vscode';

import type { BindOptions, TerminalBindOptions } from './BindOptions';
import type { EligibleTerminal } from './EligibleTerminal';
import type { WithDisplayName } from './WithDisplayName';

/**
 * Discriminator for QuickPick items across all RangeLink menus.
 * Used to identify item type after user selection.
 */
export type PickerItemKind = 'bindable' | 'terminal-more' | 'command' | 'bookmark' | 'info';

/**
 * Base QuickPickItem with RangeLink discriminator.
 * All selectable QuickPick items should extend this.
 */
interface BaseQuickPickItem extends vscode.QuickPickItem {
  readonly itemKind: PickerItemKind;
}

/**
 * Shared interface for items that track remaining count.
 * Used by "More terminals..." item to show how many are hidden.
 */
export interface WithRemainingCount {
  readonly remainingCount: number;
}

/**
 * Shared interface for items that carry bind options.
 * Generic parameter allows type narrowing (e.g., WithBindOptions<TerminalBindOptions>).
 * Used by BindableQuickPickItem to unify terminal and non-terminal destinations.
 */
export interface WithBindOptions<T extends BindOptions = BindOptions> {
  readonly bindOptions: T;
}

// ============================================================================
// Terminal Picker Types
// ============================================================================

/**
 * QuickPickItem representing the "More terminals..." overflow trigger.
 */
export interface TerminalMoreQuickPickItem
  extends BaseQuickPickItem,
    WithDisplayName,
    WithRemainingCount {
  readonly itemKind: Extract<PickerItemKind, 'terminal-more'>;
}

// ============================================================================
// Bindable Destination Types (unified terminal + non-terminal)
// ============================================================================

/**
 * QuickPickItem that binds to a destination (terminal or non-terminal).
 * Unifies terminal and destination items - the bindOptions carry all needed info.
 * The displayName is pre-formatted (e.g., 'Terminal "bash"', 'Claude Code Chat').
 *
 * Generic parameter allows type narrowing for specific bind option types:
 * - `BindableQuickPickItem` - any destination (default)
 * - `BindableQuickPickItem<TerminalBindOptions>` - terminal only
 */
export interface BindableQuickPickItem<T extends BindOptions = BindOptions>
  extends BaseQuickPickItem,
    WithBindOptions<T>,
    WithDisplayName {
  readonly itemKind: Extract<PickerItemKind, 'bindable'>;
  readonly isActive?: boolean;
}

/**
 * Terminal-specific BindableQuickPickItem that carries EligibleTerminal domain info.
 * Extends BindableQuickPickItem<TerminalBindOptions> with terminal metadata,
 * so callers get both UI item and domain object from a single source.
 */
export interface TerminalBindableQuickPickItem extends BindableQuickPickItem<TerminalBindOptions> {
  readonly terminalInfo: EligibleTerminal;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union of all QuickPickItem types used in destination pickers.
 * Includes bindable destinations and the "More terminals..." overflow item.
 */
export type DestinationQuickPickItem = BindableQuickPickItem | TerminalMoreQuickPickItem;

// ============================================================================
// Menu Item Types (StatusBar, ListBookmarks, etc.)
// ============================================================================

/**
 * QuickPickItem that executes a VSCode command on selection.
 */
export interface CommandQuickPickItem extends BaseQuickPickItem {
  readonly itemKind: Extract<PickerItemKind, 'command'>;
  readonly command: string;
}

/**
 * QuickPickItem that pastes a bookmark on selection.
 */
export interface BookmarkQuickPickItem extends BaseQuickPickItem {
  readonly itemKind: Extract<PickerItemKind, 'bookmark'>;
  readonly bookmarkId: string;
}

/**
 * Non-actionable QuickPickItem (section headers, empty state messages).
 */
export interface InfoQuickPickItem extends BaseQuickPickItem {
  readonly itemKind: Extract<PickerItemKind, 'info'>;
}

// ============================================================================
// Confirmation Dialog Types
// ============================================================================

/**
 * QuickPickItem for binary confirmation dialogs (e.g., "Replace binding?").
 * Uses a typed boolean instead of label string comparison.
 */
export interface ConfirmationQuickPickItem extends vscode.QuickPickItem {
  readonly confirmed: boolean;
}

/**
 * Union of all selectable QuickPickItem types used in the StatusBar menu.
 * Separators (QuickPickItemKind.Separator) are not selectable and use plain vscode.QuickPickItem.
 */
export type StatusBarMenuQuickPickItem =
  | BindableQuickPickItem
  | TerminalMoreQuickPickItem
  | CommandQuickPickItem
  | BookmarkQuickPickItem
  | InfoQuickPickItem;
