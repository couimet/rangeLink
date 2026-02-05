import type { DestinationType } from './DestinationType';
import type { BindableQuickPickItem, TerminalMoreQuickPickItem } from './QuickPickTypes';

/**
 * Options for `getGroupedDestinationItems()`.
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
 * Grouped response from `getGroupedDestinationItems()`.
 * Keys are DestinationType values plus 'terminal-more' for overflow.
 */
export type GroupedDestinationItems = {
  readonly [K in DestinationType]?: BindableQuickPickItem[];
} & {
  readonly 'terminal-more'?: TerminalMoreQuickPickItem;
};
