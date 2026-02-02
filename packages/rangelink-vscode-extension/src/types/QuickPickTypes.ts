import type * as vscode from 'vscode';

import type { BookmarkId } from '../bookmarks';
import type { RangeLinkCommandId } from '../constants';

import type { BindOptions } from './BindOptions';
import type { DestinationType, NonTerminalDestinationType } from './DestinationType';

/**
 * Discriminator for QuickPick items across all RangeLink menus.
 * Used to identify item type after user selection.
 *
 * - `bindable`: Item that binds to a destination (terminal or non-terminal)
 * - `bookmark`: Bookmark item in bookmark list
 * - `command`: Item that executes a VS Code command
 * - `confirm`: Confirmation action (e.g., "Yes, replace")
 * - `cancel`: Cancellation action (e.g., "No, keep current")
 * - `destination`: Non-terminal paste destination (legacy, use `bindable`)
 * - `info`: Non-actionable informational item
 * - `terminal`: Terminal paste destination (legacy, use `bindable`)
 * - `terminal-more`: "More terminals..." overflow trigger
 */
export type PickerItemKind =
  | 'bindable'
  | 'bookmark'
  | 'command'
  | 'confirm'
  | 'cancel'
  | 'destination'
  | 'info'
  | 'terminal'
  | 'terminal-more';

// ============================================================================
// Base Types (shared across all menus)
// ============================================================================

/**
 * Base QuickPickItem with RangeLink discriminator.
 * All selectable QuickPick items should extend this.
 */
export interface BaseQuickPickItem extends vscode.QuickPickItem {
  readonly itemKind: PickerItemKind;
}

/**
 * Type guard to check if a QuickPick item is selectable (has itemKind).
 *
 * VS Code QuickPick items can be either:
 * - Selectable items (our items extending BaseQuickPickItem with `itemKind`)
 * - Separators (VS Code's `{ kind: QuickPickItemKind.Separator }`)
 *
 * This guard discriminates between the two by checking for `itemKind` presence.
 *
 * @param item - QuickPick item to check
 * @returns true if item is selectable (has itemKind), false if separator
 */
export const isSelectableQuickPickItem = <T extends BaseQuickPickItem>(
  item: T | vscode.QuickPickItem,
): item is T => 'itemKind' in item;

/**
 * Non-actionable informational QuickPickItem.
 * Used for labels, section headers, and disabled placeholder text.
 */
export interface InfoQuickPickItem extends BaseQuickPickItem {
  readonly itemKind: 'info';
}

/**
 * QuickPickItem that executes a VS Code command.
 * Used across multiple menus (status bar, bookmark list, etc.).
 */
export interface CommandQuickPickItem extends BaseQuickPickItem {
  readonly itemKind: 'command';
  readonly command: RangeLinkCommandId;
}

// ============================================================================
// Shared Field Interfaces (used by both domain and UI types)
// ============================================================================

/**
 * Shared interface for items that reference a bookmark.
 * Used by command items that navigate to bookmarks.
 */
export interface WithBookmarkId {
  readonly bookmarkId: BookmarkId;
}

/**
 * Shared interface for items that reference a terminal.
 * Used by both domain model (TerminalPickerItem) and UI (TerminalQuickPickItem).
 */
export interface WithTerminalReference {
  readonly terminal: vscode.Terminal;
}

/**
 * Shared interface for items that specify a non-terminal destination type.
 * Used by both domain model (DestinationPickerItem) and UI (DestinationQuickPickItem).
 */
export interface WithDestinationType {
  readonly destinationType: NonTerminalDestinationType;
}

/**
 * Shared interface for items with a display name.
 * The displayName is the raw name (e.g., "Claude Code Chat", "Terminal \"bash\"").
 * Consumers add indentation/icons as needed.
 */
export interface WithDisplayName {
  readonly displayName: string;
}

/**
 * Shared interface for items that track active state.
 * Used by terminal items to indicate the active terminal.
 */
export interface WithIsActive {
  readonly isActive: boolean;
}

/**
 * Shared interface for items that track remaining count.
 * Used by "More terminals..." item to show how many are hidden.
 */
export interface WithRemainingCount {
  readonly remainingCount: number;
}

// ============================================================================
// Destination & Terminal QuickPickItem Types
// ============================================================================

/**
 * Shared interface for items that carry bind options.
 * Used by BindableQuickPickItem to unify terminal and non-terminal destinations.
 */
export interface WithBindOptions {
  readonly bindOptions: BindOptions;
}

/**
 * QuickPickItem that binds to a destination (terminal or non-terminal).
 * Unifies terminal and destination items - the bindOptions carry all needed info.
 * The displayName is pre-formatted (e.g., 'Terminal "bash"', 'Claude Code Chat').
 */
export interface BindableQuickPickItem extends BaseQuickPickItem, WithBindOptions, WithDisplayName {
  readonly itemKind: 'bindable';
  readonly isActive?: boolean;
}

/**
 * QuickPickItem for non-terminal destinations (text-editor, AI assistants).
 */
export interface DestinationQuickPickItem extends BaseQuickPickItem, WithDestinationType {
  readonly itemKind: 'destination';
}

/**
 * QuickPickItem for terminal destinations.
 */
export interface TerminalQuickPickItem extends BaseQuickPickItem, WithTerminalReference {
  readonly itemKind: 'terminal';
}

/**
 * QuickPickItem for "More terminals..." overflow action.
 * The displayName is pre-formatted (e.g., "More terminals...").
 * The remainingCount indicates how many terminals are hidden.
 */
export interface TerminalMoreQuickPickItem
  extends BaseQuickPickItem,
    WithDisplayName,
    WithRemainingCount {
  readonly itemKind: 'terminal-more';
}

/**
 * QuickPickItem for bookmark items in bookmark list.
 * Pastes a saved link when selected.
 */
export interface BookmarkQuickPickItem extends BaseQuickPickItem, WithBookmarkId {
  readonly itemKind: 'bookmark';
}

/**
 * Command item that navigates to a bookmark.
 * Combines command execution with bookmark reference.
 */
export interface BookmarkCommandQuickPickItem extends CommandQuickPickItem, WithBookmarkId {}

// ============================================================================
// Grouped Destination Items API (for DestinationAvailabilityService)
// ============================================================================

/**
 * Options for `getAvailableDestinationItems()`.
 */
export interface GetAvailableDestinationItemsOptions {
  /**
   * Filter to specific destination types. Default: all types.
   * Example: ['terminal'] to only get terminal items.
   */
  readonly destinationTypes?: DestinationType[];

  /**
   * Threshold for showing "More terminals..." item.
   * If terminals > threshold, show threshold items + "More terminals..."
   * Required when 'terminal' is in destinationTypes.
   * Caller provides - service does NOT read settings.
   */
  readonly terminalThreshold?: number;
}

/**
 * Grouped response from `getAvailableDestinationItems()`.
 * Keys are DestinationType values plus 'terminal-more' for overflow.
 */
export type GroupedDestinationItems = {
  readonly [K in DestinationType]?: BindableQuickPickItem[];
} & {
  readonly 'terminal-more'?: TerminalMoreQuickPickItem;
};

/**
 * Union type for items in grouped API response.
 */
export type AvailableDestinationItem = BindableQuickPickItem | TerminalMoreQuickPickItem;
