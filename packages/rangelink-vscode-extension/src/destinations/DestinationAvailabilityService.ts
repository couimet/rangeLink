import type { Logger } from 'barebone-logger';

import type { ConfigReader } from '../config';
import {
  DEFAULT_TERMINAL_PICKER_MAX_INLINE,
  SETTING_TERMINAL_PICKER_MAX_INLINE,
} from '../constants';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  type AIAssistantDestinationType,
  type BindableQuickPickItem,
  DESTINATION_TYPES,
  type DestinationType,
  type GetAvailableDestinationItemsOptions,
  type GroupedDestinationItems,
  MessageCode,
  type TerminalMoreQuickPickItem,
} from '../types';
import { formatMessage } from '../utils';

import type { DestinationRegistry } from './DestinationRegistry';
import {
  type EligibleTerminal,
  getEligibleTerminals,
  isTerminalDestinationEligible,
  isTextEditorDestinationEligible,
} from './utils';

/**
 * MessageCode lookup for AI assistant unavailable
 */
const AI_ASSISTANT_UNAVAILABLE_MESSAGE_CODES: Record<AIAssistantDestinationType, MessageCode> = {
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
   * @param type - AI assistant destination type
   * @returns Promise<true> if available, Promise<false> otherwise
   */
  async isAIAssistantAvailable(type: AIAssistantDestinationType): Promise<boolean> {
    const destination = this.registry.create({ type });
    const available = await destination.isAvailable();

    this.logger.debug(
      { fn: 'DestinationAvailabilityService.isAIAssistantAvailable', type, available },
      `AI assistant ${type} availability: ${available}`,
    );

    return available;
  }

  getUnavailableMessageCode(type: AIAssistantDestinationType): MessageCode {
    return AI_ASSISTANT_UNAVAILABLE_MESSAGE_CODES[type];
  }

  /**
   * Get available destinations grouped by type with pre-built QuickPick items.
   *
   * Returns items ready for QuickPick display:
   * - BindableQuickPickItem with displayName and bindOptions
   * - TerminalMoreQuickPickItem for overflow
   *
   * Items are grouped by DestinationType for easy rendering control.
   *
   * @param options - Optional filtering and threshold configuration
   * @returns Grouped destination items keyed by DestinationType
   */
  async getGroupedDestinationItems(
    options?: GetAvailableDestinationItemsOptions,
  ): Promise<GroupedDestinationItems> {
    const displayNames = this.registry.getDisplayNames();
    const result: {
      -readonly [K in keyof GroupedDestinationItems]: GroupedDestinationItems[K];
    } = {};

    const destinationTypes = options?.destinationTypes;
    const terminalThreshold =
      options?.terminalThreshold ??
      this.configReader.getWithDefault(
        SETTING_TERMINAL_PICKER_MAX_INLINE,
        DEFAULT_TERMINAL_PICKER_MAX_INLINE,
      );

    const shouldInclude = (type: DestinationType): boolean =>
      destinationTypes === undefined || destinationTypes.includes(type);

    for (const type of DESTINATION_TYPES) {
      if (!shouldInclude(type)) continue;

      switch (type) {
        case 'text-editor': {
          const textEditorEligibility = isTextEditorDestinationEligible(this.ideAdapter);
          if (textEditorEligibility.eligible) {
            const displayName = `${displayNames['text-editor']} ("${textEditorEligibility.filename}")`;
            result['text-editor'] = [
              {
                label: displayName,
                displayName,
                bindOptions: { type: 'text-editor' },
                itemKind: 'bindable',
              },
            ];
          }
          break;
        }

        case 'terminal': {
          if (!isTerminalDestinationEligible(this.ideAdapter)) break;

          const eligibleTerminals = getEligibleTerminals(this.ideAdapter);
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
          const isAvailable = await this.isAIAssistantAvailable(type);
          if (isAvailable) {
            const displayName = displayNames[type];
            result[type] = [
              {
                label: displayName,
                displayName,
                bindOptions: { type },
                itemKind: 'bindable',
              },
            ];
          }
          break;
        }

        default: {
          const exhaustiveCheck: never = type;
          throw new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_TYPE,
            message: 'Unhandled destination type in getGroupedDestinationItems',
            functionName: 'DestinationAvailabilityService.getGroupedDestinationItems',
            details: { destinationType: exhaustiveCheck },
          });
        }
      }
    }

    const countsByType = Object.fromEntries(
      Object.entries(result).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.length : 1,
      ]),
    );

    const totalItems = Object.values(countsByType).reduce((sum, count) => sum + count, 0);

    this.logger.debug(
      {
        fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
        destinationTypes: destinationTypes ?? 'all',
        terminalThreshold,
        groupCount: Object.keys(result).length,
        totalItems,
        countsByType,
      },
      `Found ${totalItems} grouped destination items`,
    );

    return result;
  }

  /**
   * Build terminal items for grouped API response.
   */
  private buildGroupedTerminalItems(
    terminals: readonly EligibleTerminal[],
    terminalThreshold: number,
  ): { items: BindableQuickPickItem[]; moreItem: TerminalMoreQuickPickItem | undefined } {
    const items: BindableQuickPickItem[] = [];

    const needsMoreItem = terminals.length > terminalThreshold;
    const terminalsToShowCount = needsMoreItem ? terminalThreshold - 1 : terminals.length;
    const terminalsToShow = terminals.slice(0, terminalsToShowCount);

    for (const { terminal, name, isActive } of terminalsToShow) {
      const displayName = formatMessage(MessageCode.TERMINAL_PICKER_TERMINAL_LABEL_FORMAT, {
        name,
      });
      items.push({
        label: displayName,
        displayName,
        bindOptions: { type: 'terminal', terminal },
        isActive,
        itemKind: 'bindable',
      });
    }

    let moreItem: TerminalMoreQuickPickItem | undefined;
    if (needsMoreItem) {
      const remainingCount = terminals.length - terminalsToShowCount;
      const displayName = formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL);
      moreItem = {
        label: displayName,
        displayName,
        remainingCount,
        itemKind: 'terminal-more',
      };
    }

    return { items, moreItem };
  }
}
