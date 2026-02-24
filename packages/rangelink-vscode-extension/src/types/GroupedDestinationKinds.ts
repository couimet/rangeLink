import type { DestinationKind } from './DestinationKind';
import type {
  BindableQuickPickItem,
  FileBindableQuickPickItem,
  FileMoreQuickPickItem,
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

  /**
   * processId of the currently bound terminal, for bound-state badge display.
   * When provided, the matching terminal gets `boundState: 'bound'` and is
   * sorted to the top of the terminal list.
   */
  readonly boundTerminalProcessId?: number;

  /**
   * URI string of the currently bound file, for bound-state badge display.
   * When provided, the matching file gets `boundState: 'bound'` and is
   * sorted to the top of the file list.
   */
  readonly boundFileUriString?: string;
}

/**
 * Grouped response from `getGroupedDestinationItems()`.
 *
 * File and terminal buckets use domain-specific QuickPickItem types that carry
 * EligibleFile/EligibleTerminal domain info alongside UI properties.
 *
 * Non-terminal/non-file buckets use generic `BindableQuickPickItem[]`.
 */
export type GroupedDestinationItems = {
  readonly [K in Exclude<DestinationKind, 'terminal' | 'text-editor'>]?: BindableQuickPickItem[];
} & {
  readonly 'text-editor'?: FileBindableQuickPickItem[];
  readonly 'file-more'?: FileMoreQuickPickItem;
  readonly terminal?: TerminalBindableQuickPickItem[];
  readonly 'terminal-more'?: TerminalMoreQuickPickItem;
};
