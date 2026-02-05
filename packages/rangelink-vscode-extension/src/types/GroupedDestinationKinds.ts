import type { DestinationKind } from './DestinationKind';
import type { BindableQuickPickItem, TerminalMoreQuickPickItem } from './QuickPickTypes';

/**
 * Options for `getGroupedDestinationItems()`.
 */
export interface GetAvailableDestinationItemsOptions {
  /**
   * Filter to specific destination kinds. Default: all kinds.
   * Example: ['terminal'] to only get terminal items.
   */
  readonly destinationKinds?: DestinationKind[];

  /**
   * Threshold for showing "More terminals..." item.
   * If terminals > threshold, show threshold items + "More terminals..."
   * Required when 'terminal' is in destinationKinds.
   * Caller provides - service does NOT read settings.
   */
  readonly terminalThreshold?: number;
}

/**
 * Grouped response from `getGroupedDestinationItems()`.
 * Keys are DestinationKind values plus 'terminal-more' for overflow.
 */
export type GroupedDestinationItems = {
  readonly [K in DestinationKind]?: BindableQuickPickItem[];
} & {
  readonly 'terminal-more'?: TerminalMoreQuickPickItem;
};
