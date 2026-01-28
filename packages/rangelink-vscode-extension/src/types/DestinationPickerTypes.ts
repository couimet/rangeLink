import type * as vscode from 'vscode';

import type { DestinationType } from './DestinationType';

/**
 * Non-terminal destination types (text-editor and AI assistants).
 * Terminal destinations use TerminalPickerItem which carries the terminal reference.
 */
export type NonTerminalDestinationType = Exclude<DestinationType, 'terminal'>;

// ============================================================================
// Domain Model Items (discriminated union)
// ============================================================================

/**
 * Non-terminal destination picker item (text-editor and AI assistants).
 */
export interface DestinationPickerItem {
  readonly kind: 'destination';
  readonly destinationType: NonTerminalDestinationType;
  readonly displayName: string;
}

/**
 * Terminal picker item with reference to the actual terminal.
 */
export interface TerminalPickerItem {
  readonly kind: 'terminal';
  readonly terminal: vscode.Terminal;
  readonly displayName: string;
  readonly isActive: boolean;
}

/**
 * "More terminals..." overflow item - triggers secondary picker.
 */
export interface TerminalMorePickerItem {
  readonly kind: 'terminal-more';
  readonly displayName: string;
  readonly remainingCount: number;
}

/**
 * Union of all picker item types.
 *
 * Note: Separators are not included - they are a UI concern handled
 * during QuickPickItem conversion, not a domain concept.
 */
export type AnyPickerItem = DestinationPickerItem | TerminalPickerItem | TerminalMorePickerItem;

// ============================================================================
// VSCode Adapter (intersection type for strong typing)
// ============================================================================

/**
 * Discriminator for destination-related QuickPick items.
 * Used to identify item type after user selection.
 */
export type PickerItemKind = 'destination' | 'terminal' | 'terminal-more';

/**
 * Base QuickPickItem with our discriminator.
 */
interface BaseDestinationQuickPickItem extends vscode.QuickPickItem {
  readonly itemKind: PickerItemKind;
}

/**
 * QuickPickItem for non-terminal destinations (text-editor, AI assistants).
 */
export interface DestinationQuickPickItem extends BaseDestinationQuickPickItem {
  readonly itemKind: 'destination';
  readonly destinationType: NonTerminalDestinationType;
}

/**
 * QuickPickItem for terminal destinations.
 */
export interface TerminalQuickPickItem extends BaseDestinationQuickPickItem {
  readonly itemKind: 'terminal';
  readonly terminal: vscode.Terminal;
}

/**
 * QuickPickItem for "More terminals..." overflow action.
 */
export interface TerminalMoreQuickPickItem extends BaseDestinationQuickPickItem {
  readonly itemKind: 'terminal-more';
}

/**
 * Union of all selectable destination QuickPickItems.
 *
 * This is the type returned when user selects from the picker.
 * Separators (QuickPickItemKind.Separator) are not selectable and not included.
 */
export type AnyDestinationQuickPickItem =
  | DestinationQuickPickItem
  | TerminalQuickPickItem
  | TerminalMoreQuickPickItem;
