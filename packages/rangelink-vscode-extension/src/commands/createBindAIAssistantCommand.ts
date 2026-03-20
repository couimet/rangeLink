import type { Logger } from 'barebone-logger';

import type { DestinationAvailabilityService } from '../destinations/DestinationAvailabilityService';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { AIAssistantDestinationKind } from '../types';
import { formatMessage } from '../utils';

/**
 * Factory that creates a command handler for binding to an AI assistant destination.
 *
 * All AI assistant bind commands share the same logic:
 * 1. Check if the assistant is available
 * 2. Show an info message if unavailable
 * 3. Bind to the destination if available
 *
 * @param kind - Which AI assistant to bind to
 * @param availabilityService - Service for checking assistant availability
 * @param destinationManager - Manager for binding destinations
 * @param ideAdapter - Adapter for showing messages
 * @param logger - Logger instance
 * @returns Async handler suitable for registerCommand()
 */
export const createBindAIAssistantCommand = (
  kind: AIAssistantDestinationKind,
  availabilityService: DestinationAvailabilityService,
  destinationManager: PasteDestinationManager,
  ideAdapter: VscodeAdapter,
  logger: Logger,
): (() => Promise<void>) => {
  const fn = `createBindAIAssistantCommand[${kind}]`;

  return async () => {
    logger.debug({ fn, kind }, `Executing bind command for ${kind}`);

    if (!(await availabilityService.isAIAssistantAvailable(kind))) {
      logger.info({ fn, kind }, `${kind} not available`);
      void ideAdapter.showInformationMessage(
        formatMessage(availabilityService.getUnavailableMessageCode(kind)),
      );
      return;
    }

    await destinationManager.bind({ kind });
    logger.debug({ fn, kind }, `Bind command completed for ${kind}`);
  };
};
