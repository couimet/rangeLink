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

  // ── Terminal ──────────────────────────────────────────────────────────────

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

  // ── File / text-editor ────────────────────────────────────────────────────

  /**
   * URI string of the currently bound file, for bound-state badge display.
   * When provided, the matching file gets `boundState: 'bound'` and is
   * sorted to the top of the file list.
   */
  readonly boundFileUriString?: string;

  /**
   * viewColumn of the currently bound file's editor, for precise bound-state matching.
   * The same URI can be open in multiple tab groups (view columns); without this,
   * all copies of the file would be marked bound.
   * When omitted, matching falls back to URI alone.
   */
  readonly boundFileViewColumn?: number;
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
