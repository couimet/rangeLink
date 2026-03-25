import type { Logger } from 'barebone-logger';

import type { CustomAiAssistantKind } from '../types';

import type { ConfigReader } from './ConfigReader';

const SETTING_KEY = 'customAiAssistants';

export interface CustomAiAssistantConfig {
  kind: CustomAiAssistantKind;
  extensionId: string;
  extensionName: string;
  focusCommands: string[];
}

interface RawCustomAiAssistantEntry {
  extensionId?: unknown;
  extensionName?: unknown;
  focusCommands?: unknown;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNonEmptyStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => isNonEmptyString(item));

/**
 * Parse and validate custom AI assistant entries from user settings.
 * Invalid entries are logged as warnings and skipped — never crash the extension.
 */
export const parseCustomAiAssistants = (
  configReader: ConfigReader,
  logger: Logger,
): CustomAiAssistantConfig[] => {
  const raw = configReader.get<RawCustomAiAssistantEntry[]>(SETTING_KEY);

  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  const results: CustomAiAssistantConfig[] = [];
  const seenIds = new Set<string>();

  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== 'object') {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index },
        `Skipping customAiAssistants[${index}]: not an object`,
      );
      continue;
    }

    const { extensionId, extensionName, focusCommands } = entry;

    if (!isNonEmptyString(extensionId)) {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index, extensionId },
        `Skipping customAiAssistants[${index}]: extensionId must be a non-empty string`,
      );
      continue;
    }

    if (!isNonEmptyString(extensionName)) {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index, extensionName },
        `Skipping customAiAssistants[${index}]: extensionName must be a non-empty string`,
      );
      continue;
    }

    if (!isNonEmptyStringArray(focusCommands)) {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index, focusCommands },
        `Skipping customAiAssistants[${index}]: focusCommands must be a non-empty array of strings`,
      );
      continue;
    }

    if (seenIds.has(extensionId)) {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index, extensionId },
        `Skipping customAiAssistants[${index}]: duplicate extensionId '${extensionId}'`,
      );
      continue;
    }

    seenIds.add(extensionId);
    results.push({
      kind: `custom-ai:${extensionId}`,
      extensionId,
      extensionName,
      focusCommands,
    });
  }

  if (results.length > 0) {
    logger.info(
      { fn: 'parseCustomAiAssistants', count: results.length, ids: results.map((r) => r.extensionId) },
      `Loaded ${results.length} custom AI assistant(s)`,
    );
  }

  return results;
};
