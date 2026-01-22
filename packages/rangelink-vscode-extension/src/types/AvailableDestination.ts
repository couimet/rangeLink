import type * as vscode from 'vscode';

import type { DestinationType } from '../destinations/PasteDestination';

/**
 * Base destination item - used for text-editor and AI assistants
 */
export interface DestinationItem {
  readonly kind: 'destination';
  readonly type: DestinationType;
  readonly displayName: string;
}

/**
 * Individual terminal item with reference to the actual terminal
 */
export interface TerminalItem {
  readonly kind: 'terminal';
  readonly terminal: vscode.Terminal;
  readonly displayName: string;
  readonly isActive: boolean;
}

/**
 * Terminal section separator - non-selectable header
 */
export interface TerminalSeparatorItem {
  readonly kind: 'terminal-separator';
  readonly displayName: string;
}

/**
 * "More terminals..." item - triggers secondary picker
 */
export interface TerminalMoreItem {
  readonly kind: 'terminal-more';
  readonly displayName: string;
  readonly remainingCount: number;
}

/**
 * Union of all available destination item types
 */
export type AvailableDestinationItem =
  | DestinationItem
  | TerminalItem
  | TerminalSeparatorItem
  | TerminalMoreItem;
