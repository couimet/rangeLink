import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { ConfigReader } from '../config';
import {
  DEFAULT_TERMINAL_PICKER_MAX_INLINE,
  SETTING_TERMINAL_PICKER_MAX_INLINE,
} from '../constants';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  AI_ASSISTANT_KINDS,
  type AIAssistantDestinationKind,
  type AvailableDestination,
  type BindableQuickPickItem,
  DESTINATION_KINDS,
  type GetAvailableDestinationItemsOptions,
  type GroupedDestinationItems,
  MessageCode,
  type TerminalBindableQuickPickItem,
  type TerminalMoreQuickPickItem,
} from '../types';
import { formatMessage } from '../utils';

import type { DestinationRegistry } from './DestinationRegistry';
import {
  type EligibleTerminal,
  getEligibleTerminals,
  getTerminalDestinationEligibility,
  isTextEditorDestinationEligible,
} from './utils';

const MIN_TERMINAL_PICKER_THRESHOLD = 1;

const isValidThreshold = (value: number): boolean =>
  Number.isFinite(value) && value >= MIN_TERMINAL_PICKER_THRESHOLD;

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

  async getAvailableDestinations(): Promise<AvailableDestination[]> {
    const displayNames = this.registry.getDisplayNames();
    const available: AvailableDestination[] = [];

    const textEditorEligibility = isTextEditorDestinationEligible(this.ideAdapter);
    const terminalEligibility = getTerminalDestinationEligibility(this.ideAdapter);

    if (textEditorEligibility.eligible) {
      available.push({
        kind: 'text-editor',
        displayName: `${displayNames['text-editor']} ("${textEditorEligibility.filename}")`,
      });
    }

    if (terminalEligibility.eligible) {
      available.push({
        kind: 'terminal',
        displayName: `${displayNames.terminal} ("${terminalEligibility.terminalName}")`,
      });
    }

    const aiResults = await Promise.all(
      AI_ASSISTANT_KINDS.map(async (kind) => ({
        kind,
        available: await this.isAIAssistantAvailable(kind),
      })),
    );

    for (const { kind, available: isAvailable } of aiResults) {
      if (isAvailable) {
        available.push({
          kind,
          displayName: displayNames[kind],
        });
      }
    }

    this.logger.debug(
      {
        fn: 'DestinationAvailabilityService.getAvailableDestinations',
        isTextEditorEligible: textEditorEligibility.eligible,
        isTerminalEligible: terminalEligibility.eligible,
        availableCount: available.length,
        availableKinds: available.map((d) => d.kind),
      },
      `Found ${available.length} available destinations`,
    );

    return available;
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
          if (!getTerminalDestinationEligibility(this.ideAdapter).eligible) break;

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
    items: BindableQuickPickItem[];
    moreItem: TerminalMoreQuickPickItem | undefined;
  } {
    const activeTerminal = this.ideAdapter.activeTerminal;

    if (eligibleTerminals.length <= threshold) {
      return {
        items: eligibleTerminals.map((t) => this.buildTerminalItem(t, activeTerminal)),
        moreItem: undefined,
      };
    }

    const inlineTerminals = eligibleTerminals.slice(0, threshold);
    const remainingCount = eligibleTerminals.length - threshold;

    return {
      items: inlineTerminals.map((t) => this.buildTerminalItem(t, activeTerminal)),
      moreItem: {
        label: formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL),
        displayName: formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL),
        remainingCount,
        itemKind: 'terminal-more',
      },
    };
  }

  /**
   * Build a single terminal QuickPick item.
   */
  private buildTerminalItem(
    eligibleTerminal: EligibleTerminal,
    activeTerminal: vscode.Terminal | undefined,
  ): BindableQuickPickItem {
    const displayName = formatMessage(MessageCode.DESTINATION_TERMINAL_DISPLAY_FORMAT, {
      name: eligibleTerminal.terminal.name,
    });
    const isActive = eligibleTerminal.terminal === activeTerminal;

    return {
      label: displayName,
      displayName,
      bindOptions: { kind: 'terminal', terminal: eligibleTerminal.terminal },
      itemKind: 'bindable',
      isActive,
    };
  }

  /**
   * Resolve the terminal threshold to use, handling options, config, validation, and normalization.
   */
  private resolveTerminalThreshold(options?: GetAvailableDestinationItemsOptions): number {
    const providedThreshold = options?.terminalThreshold;
    const configThreshold = this.configReader.getWithDefault(
      SETTING_TERMINAL_PICKER_MAX_INLINE,
      DEFAULT_TERMINAL_PICKER_MAX_INLINE,
    );

    let effectiveThreshold = providedThreshold ?? configThreshold;

    if (!isValidThreshold(effectiveThreshold)) {
      this.logger.warn(
        {
          fn: 'DestinationAvailabilityService.resolveTerminalThreshold',
          invalidValue: effectiveThreshold,
          fallback: DEFAULT_TERMINAL_PICKER_MAX_INLINE,
        },
        'Invalid terminalThreshold, using default',
      );
      effectiveThreshold = DEFAULT_TERMINAL_PICKER_MAX_INLINE;
    }

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
