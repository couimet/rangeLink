import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { AvailableDestination } from '../types/AvailableDestination';
import { MessageCode } from '../types/MessageCode';

import type { DestinationRegistry } from './DestinationRegistry';
import type { AIAssistantDestinationType } from './PasteDestination';
import { isTerminalDestinationEligible, isTextEditorDestinationEligible } from './utils';

/**
 * All AI assistant destination types to check for availability
 */
const AI_ASSISTANT_TYPES: readonly AIAssistantDestinationType[] = [
  'claude-code',
  'github-copilot-chat',
  'cursor-ai',
];

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

  async getAvailableDestinations(): Promise<AvailableDestination[]> {
    const displayNames = this.registry.getDisplayNames();
    const available: AvailableDestination[] = [];

    const isTextEditorEligible = isTextEditorDestinationEligible(this.ideAdapter);
    const isTerminalEligible = isTerminalDestinationEligible(this.ideAdapter);

    if (isTextEditorEligible) {
      available.push({
        type: 'text-editor',
        displayName: displayNames['text-editor'],
      });
    }

    if (isTerminalEligible) {
      available.push({
        type: 'terminal',
        displayName: displayNames.terminal,
      });
    }

    const aiResults = await Promise.all(
      AI_ASSISTANT_TYPES.map(async (type) => ({
        type,
        available: await this.isAIAssistantAvailable(type),
      })),
    );

    for (const { type, available: isAvailable } of aiResults) {
      if (isAvailable) {
        available.push({
          type,
          displayName: displayNames[type],
        });
      }
    }

    this.logger.debug(
      {
        fn: 'DestinationAvailabilityService.getAvailableDestinations',
        isTextEditorEligible,
        isTerminalEligible,
        availableCount: available.length,
        availableTypes: available.map((d) => d.type),
      },
      `Found ${available.length} available destinations`,
    );

    return available;
  }
}
