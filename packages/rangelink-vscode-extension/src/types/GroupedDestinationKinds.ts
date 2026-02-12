import type { DestinationKind } from './DestinationKind';
import type {
  BindableQuickPickItem,
  TerminalBindableQuickPickItem,
  TerminalMoreQuickPickItem,
} from './QuickPickTypes';

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
 *
 * Terminal bucket uses `TerminalBindableQuickPickItem[]` which extends
 * `BindableQuickPickItem<TerminalBindOptions>` with `terminalInfo: EligibleTerminal`,
 * providing both UI item and domain object from a single source.
 *
 * Non-terminal buckets use generic `BindableQuickPickItem[]`.
 */
export type GroupedDestinationItems = {
  readonly [K in Exclude<DestinationKind, 'terminal'>]?: BindableQuickPickItem[];
} & {
  readonly terminal?: TerminalBindableQuickPickItem[];
  readonly 'terminal-more'?: TerminalMoreQuickPickItem;
};
