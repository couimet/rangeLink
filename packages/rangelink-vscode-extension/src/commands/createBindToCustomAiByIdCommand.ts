import type { Logger } from '@couimet/logger-contract';

import type { CustomAiAssistantConfig } from '../config/parseCustomAiAssistants';
import { resolveKindByExtensionId } from '../destinations/destinationBuilders';
import type { BindSuccessInfo } from '../destinations/PasteDestinationManager';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import { ExtensionResult } from '../types';

const FN = 'createBindToCustomAiByIdCommand';

export const createBindToCustomAiByIdCommand = (
  customAssistants: CustomAiAssistantConfig[],
  destinationManager: PasteDestinationManager,
  logger: Logger,
): ((args: unknown) => Promise<ExtensionResult<BindSuccessInfo>>) => {
  return async (args: unknown): Promise<ExtensionResult<BindSuccessInfo>> => {
    const extensionId = extractExtensionId(args, logger);
    if (!extensionId) {
      return ExtensionResult.err<BindSuccessInfo>(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID,
          message: 'Argument must be { extensionId: string }',
          functionName: FN,
        }),
      );
    }

    const kind = resolveKindByExtensionId(extensionId, customAssistants);
    if (!kind) {
      return ExtensionResult.err<BindSuccessInfo>(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.CUSTOM_AI_NOT_FOUND_BY_EXTENSION_ID,
          message: `No AI assistant found with extension ID '${extensionId}'`,
          functionName: FN,
        }),
      );
    }

    logger.debug({ fn: FN, extensionId, kind }, 'Binding to custom AI by ID');

    return destinationManager.bind({ kind } as Parameters<PasteDestinationManager['bind']>[0]);
  };
};

const extractExtensionId = (args: unknown, logger: Logger): string | undefined => {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    logger.warn({ fn: FN }, 'Invalid or missing arguments for bindToCustomAiById');
    return undefined;
  }

  const obj = args as Record<string, unknown>;
  if (typeof obj.extensionId !== 'string' || obj.extensionId.length === 0) {
    logger.warn({ fn: FN, argsType: typeof args }, 'Missing or invalid extensionId in args');
    return undefined;
  }

  return obj.extensionId;
};
