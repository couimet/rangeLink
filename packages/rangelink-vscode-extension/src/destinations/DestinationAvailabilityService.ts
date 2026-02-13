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
  type EligibleTerminal,
  type GetAvailableDestinationItemsOptions,
  type GroupedDestinationItems,
  MessageCode,
  type TerminalBindableQuickPickItem,
  type TerminalMoreQuickPickItem,
} from '../types';
import { formatMessage } from '../utils';

import type { DestinationRegistry } from './DestinationRegistry';
import {
  getEligibleTerminals,
  isTextEditorDestinationEligible,
  markBoundTerminal,
  sortEligibleTerminals,
} from './utils';

const MIN_TERMINAL_PICKER_THRESHOLD = 1;

const isValidThreshold = (value: number): boolean =>
  value === Infinity || (Number.isFinite(value) && value >= MIN_TERMINAL_PICKER_THRESHOLD);

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
    const displayNames = this.registry.getDisplayNames();
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
          const textEditorEligibility = isTextEditorDestinationEligible(this.ideAdapter);
          if (!textEditorEligibility.eligible) break;

          const displayName = `${displayNames['text-editor']} ("${textEditorEligibility.filename}")`;
          result['text-editor'] = [
            {
              label: displayName,
              displayName,
              bindOptions: { kind: 'text-editor' },
              itemKind: 'bindable',
            },
          ];
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

  /**
   * Build terminal items with overflow handling.
   */
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
