import type { Logger } from 'barebone-logger';

import type { DestinationAvailabilityService } from '../destinations/DestinationAvailabilityService';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { AIAssistantDestinationKind } from '../types';
import { formatMessage } from '../utils';

/**
 * Creates a command handler for binding to an AI assistant destination.
 * Returns an async handler suitable for ideAdapter.registerCommand().
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
