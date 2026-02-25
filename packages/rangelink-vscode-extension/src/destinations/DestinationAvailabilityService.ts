import type { Logger } from 'barebone-logger';

import type { ConfigReader } from '../config';
import {
  DEFAULT_TERMINAL_PICKER_MAX_INLINE,
  SETTING_TERMINAL_PICKER_MAX_INLINE,
} from '../constants';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  type AIAssistantDestinationKind,
  DESTINATION_KINDS,
  type EligibleFile,
  type EligibleTerminal,
  type FileBindableQuickPickItem,
  type FileMoreQuickPickItem,
  type GetAvailableDestinationItemsOptions,
  type GroupedDestinationItems,
  MessageCode,
  type TerminalBindableQuickPickItem,
  type TerminalMoreQuickPickItem,
} from '../types';
import { formatMessage } from '../utils';

import type { DestinationRegistry } from './DestinationRegistry';
import {
  buildFileDescription,
  disambiguateFilenames,
  getEligibleFiles,
  getEligibleTerminals,
  markBoundFile,
  markBoundTerminal,
  sortEligibleFiles,
  sortEligibleTerminals,
} from './utils';

const MIN_THRESHOLD = 1;

const isValidThreshold = (value: number): boolean =>
  value === Infinity || (Number.isFinite(value) && value >= MIN_THRESHOLD);

/**
 * MessageCode lookup for AI assistant unavailable
 */
const AI_ASSISTANT_UNAVAILABLE_MESSAGE_CODES: Record<AIAssistantDestinationKind, MessageCode> = {
  'claude-code': MessageCode.INFO_CLAUDE_CODE_NOT_AVAILABLE,
  'cursor-ai': MessageCode.INFO_CURSOR_AI_NOT_AVAILABLE,
  'github-copilot-chat': MessageCode.INFO_GITHUB_COPILOT_CHAT_NOT_AVAILABLE,
};

/**
 * Service for checking destination availability
 *
 * Provides a centralized way to:
 * - Check if AI assistant destinations are available (extension installed/active)
 * - Get message codes for unavailable destinations
 * - Discover all available destinations for quick pick menus
 *
 * Design principles:
 * - Reads IDE state via VscodeAdapter (no side effects like showing messages)
 * - Reusable by both bind commands and quick pick menus
 * - Returns data (message codes) rather than calling showMessage directly
 */
export class DestinationAvailabilityService {
  constructor(
    private readonly registry: DestinationRegistry,
    private readonly ideAdapter: VscodeAdapter,
    private readonly configReader: ConfigReader,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if an AI assistant destination is available
   *
   * Creates a temporary destination instance and checks its availability.
   * Used by bind commands to verify extension is installed/active.
   *
   * @param kind - AI assistant destination kind
   * @returns Promise<true> if available, Promise<false> otherwise
   */
  async isAIAssistantAvailable(kind: AIAssistantDestinationKind): Promise<boolean> {
    const destination = this.registry.create({ kind });
    const available = await destination.isAvailable();

    this.logger.debug(
      { fn: 'DestinationAvailabilityService.isAIAssistantAvailable', kind, available },
      `AI assistant ${kind} availability: ${available}`,
    );

    return available;
  }

  getUnavailableMessageCode(kind: AIAssistantDestinationKind): MessageCode {
    return AI_ASSISTANT_UNAVAILABLE_MESSAGE_CODES[kind];
  }

  /**
   * Get terminal items with threshold-based overflow handling.
   * Convenience passthrough to `getGroupedDestinationItems()` for terminal-only callers.
   *
   * @param terminalThreshold - Max terminals to show inline (use Infinity for all)
   * @param boundTerminalProcessId - processId of the currently bound terminal for badge display
   */
  async getTerminalItems(
    terminalThreshold: number,
    boundTerminalProcessId?: number,
  ): Promise<TerminalBindableQuickPickItem[]> {
    const grouped = await this.getGroupedDestinationItems({
      destinationKinds: ['terminal'],
      terminalThreshold,
      boundTerminalProcessId,
    });
    return grouped['terminal'] ?? [];
  }

  /**
   * Get file items split by current-in-group status.
   * Convenience passthrough to `getGroupedDestinationItems()` for file-only callers.
   *
   * @param boundFileUriString - URI string of the currently bound file for badge display
   * @param boundFileViewColumn - viewColumn of the bound editor for precise matching
   */
  async getFileItems(
    boundFileUriString?: string,
    boundFileViewColumn?: number,
  ): Promise<FileBindableQuickPickItem[]> {
    const grouped = await this.getGroupedDestinationItems({
      destinationKinds: ['text-editor'],
      boundFileUriString,
      boundFileViewColumn,
    });
    return grouped['text-editor'] ?? [];
  }

  /**
   * Get ALL eligible file items — both current-in-group and non-current.
   * Used by the secondary file picker which shows all files across all tab groups.
   *
   * Runs the full pipeline: getEligibleFiles → markBoundFile → sortEligibleFiles →
   * disambiguateFilenames → buildFileItem for every file.
   *
   * @param boundFileUriString - URI string of the currently bound file for badge display
   * @param boundFileViewColumn - viewColumn of the bound editor for precise matching
   */
  getAllFileItems(
    boundFileUriString?: string,
    boundFileViewColumn?: number,
  ): FileBindableQuickPickItem[] {
    const rawFiles = getEligibleFiles(this.ideAdapter);
    if (rawFiles.length === 0) {
      return [];
    }

    const enriched = markBoundFile(rawFiles, boundFileUriString, boundFileViewColumn);
    const sorted = sortEligibleFiles(enriched);
    const disambiguators = disambiguateFilenames(sorted);

    this.logger.debug(
      { fn: 'DestinationAvailabilityService.getAllFileItems', fileCount: sorted.length },
      'Built all file items',
    );

    return sorted.map((file, i) => this.buildFileItem(file, disambiguators[i]));
  }

  /**
   * Get available destinations grouped by kind with pre-built QuickPick items.
   *
   * Items are grouped by DestinationKind for easy rendering control.
   *
   * @param options - Optional filtering and threshold configuration
   * @returns Grouped destination items keyed by DestinationKind
   */
  async getGroupedDestinationItems(
    options?: GetAvailableDestinationItemsOptions,
  ): Promise<GroupedDestinationItems> {
    const result: {
      -readonly [K in keyof GroupedDestinationItems]: GroupedDestinationItems[K];
    } = {};

    const destinationKinds = options?.destinationKinds ?? DESTINATION_KINDS;
    if (options?.destinationKinds) {
      this.logger.debug(
        { fn: 'DestinationAvailabilityService.getGroupedDestinationItems', destinationKinds },
        'Using provided destinationKinds filter',
      );
    } else {
      this.logger.debug(
        { fn: 'DestinationAvailabilityService.getGroupedDestinationItems' },
        'Using default DESTINATION_KINDS',
      );
    }

    const terminalThreshold = this.resolveTerminalThreshold(options);

    for (const kind of destinationKinds) {
      switch (kind) {
        case 'text-editor': {
          const rawFiles = getEligibleFiles(this.ideAdapter);
          if (rawFiles.length === 0) break;

          const enriched = markBoundFile(
            rawFiles,
            options?.boundFileUriString,
            options?.boundFileViewColumn,
          );
          const sorted = sortEligibleFiles(enriched);
          const disambiguators = disambiguateFilenames(sorted);

          const { items, moreItem } = this.buildGroupedFileItems(sorted, disambiguators);
          if (items.length > 0) {
            result['text-editor'] = items;
          }
          if (moreItem) {
            result['file-more'] = moreItem;
          }
          break;
        }

        case 'terminal': {
          const rawTerminals = await getEligibleTerminals(this.ideAdapter);
          if (rawTerminals.length === 0) break;

          const enriched = markBoundTerminal(rawTerminals, options?.boundTerminalProcessId);
          const eligibleTerminals = sortEligibleTerminals(enriched);

          const { items, moreItem } = this.buildGroupedTerminalItems(
            eligibleTerminals,
            terminalThreshold,
          );
          if (items.length > 0) {
            result['terminal'] = items;
          }
          if (moreItem) {
            result['terminal-more'] = moreItem;
          }
          break;
        }

        case 'claude-code':
        case 'cursor-ai':
        case 'github-copilot-chat': {
          const displayNames = this.registry.getDisplayNames();
          const available = await this.isAIAssistantAvailable(kind);
          if (!available) break;

          const displayName = displayNames[kind];
          result[kind] = [
            {
              label: displayName,
              displayName,
              bindOptions: { kind },
              itemKind: 'bindable',
            },
          ];
          break;
        }

        default: {
          const _exhaustiveCheck: never = kind;
          throw new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
            message: `Unhandled destination kind in getGroupedDestinationItems`,
            functionName: 'DestinationAvailabilityService.getGroupedDestinationItems',
            details: { kind: _exhaustiveCheck },
          });
        }
      }
    }

    this.logger.debug(
      {
        fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
        groupKeys: Object.keys(result),
      },
      `Built grouped destination items`,
    );

    return result;
  }

  // ===========================================================================
  // File item builders
  // ===========================================================================

  private buildGroupedFileItems(
    eligibleFiles: EligibleFile[],
    disambiguators: string[],
  ): {
    items: FileBindableQuickPickItem[];
    moreItem: FileMoreQuickPickItem | undefined;
  } {
    const inlineItems: FileBindableQuickPickItem[] = [];
    let remainingCount = 0;

    for (let i = 0; i < eligibleFiles.length; i++) {
      if (eligibleFiles[i].isCurrentInGroup) {
        inlineItems.push(this.buildFileItem(eligibleFiles[i], disambiguators[i]));
      } else {
        remainingCount++;
      }
    }

    return {
      items: inlineItems,
      moreItem:
        remainingCount > 0
          ? {
              label: formatMessage(MessageCode.FILE_PICKER_MORE_LABEL),
              displayName: formatMessage(MessageCode.FILE_PICKER_MORE_LABEL),
              remainingCount,
              itemKind: 'file-more',
            }
          : undefined,
    };
  }

  private buildFileItem(
    eligibleFile: EligibleFile,
    disambiguator: string,
  ): FileBindableQuickPickItem {
    return {
      label: eligibleFile.filename,
      displayName: eligibleFile.filename,
      description: buildFileDescription(eligibleFile, disambiguator),
      bindOptions: {
        kind: 'text-editor',
        uri: eligibleFile.uri,
        viewColumn: eligibleFile.viewColumn,
      },
      itemKind: 'bindable',
      fileInfo: eligibleFile,
      boundState: eligibleFile.boundState,
    };
  }

  // ===========================================================================
  // Terminal item builders
  // ===========================================================================

  private buildGroupedTerminalItems(
    eligibleTerminals: EligibleTerminal[],
    threshold: number,
  ): {
    items: TerminalBindableQuickPickItem[];
    moreItem: TerminalMoreQuickPickItem | undefined;
  } {
    if (eligibleTerminals.length <= threshold) {
      return {
        items: eligibleTerminals.map((t) => this.buildTerminalItem(t)),
        moreItem: undefined,
      };
    }

    const inlineTerminals = eligibleTerminals.slice(0, threshold);
    const remainingCount = eligibleTerminals.length - threshold;

    return {
      items: inlineTerminals.map((t) => this.buildTerminalItem(t)),
      moreItem: {
        label: formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL),
        displayName: formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL),
        remainingCount,
        itemKind: 'terminal-more',
      },
    };
  }

  private buildTerminalItem(eligibleTerminal: EligibleTerminal): TerminalBindableQuickPickItem {
    const displayName = formatMessage(MessageCode.DESTINATION_TERMINAL_DISPLAY_FORMAT, {
      name: eligibleTerminal.terminal.name,
    });

    return {
      label: displayName,
      displayName,
      bindOptions: { kind: 'terminal', terminal: eligibleTerminal.terminal },
      itemKind: 'bindable',
      isActive: eligibleTerminal.isActive,
      boundState: eligibleTerminal.boundState,
      terminalInfo: eligibleTerminal,
    };
  }

  /**
   * Resolve the terminal threshold to use, handling options, config, validation, and normalization.
   */
  private resolveTerminalThreshold(options?: GetAvailableDestinationItemsOptions): number {
    const fallback = DEFAULT_TERMINAL_PICKER_MAX_INLINE;
    const providedThreshold = options?.terminalThreshold;
    const configThreshold = this.configReader.getWithDefault(
      SETTING_TERMINAL_PICKER_MAX_INLINE,
      fallback,
    );

    let effectiveThreshold = providedThreshold ?? configThreshold;

    if (!isValidThreshold(effectiveThreshold)) {
      this.logger.warn(
        {
          fn: 'DestinationAvailabilityService.resolveTerminalThreshold',
          invalidValue: effectiveThreshold,
          fallback,
        },
        'Invalid terminalThreshold, using default',
      );
      effectiveThreshold = fallback;
    }

    // Safe for Infinity: Math.floor(Infinity) === Infinity (shows all terminals inline)
    effectiveThreshold = Math.floor(effectiveThreshold);

    this.logger.debug(
      {
        fn: 'DestinationAvailabilityService.resolveTerminalThreshold',
        providedThreshold,
        configThreshold,
        effectiveThreshold,
      },
      'Resolved terminalThreshold',
    );

    return effectiveThreshold;
  }
}
