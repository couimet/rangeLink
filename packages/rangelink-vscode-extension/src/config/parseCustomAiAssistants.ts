import type { Logger } from 'barebone-logger';

import type { InsertCommandEntry } from '../destinations/capabilities/insertFactories';
import type { CustomAiAssistantKind } from '../types';

import type { ConfigReader } from './ConfigReader';

const SETTING_KEY = 'customAiAssistants';

export interface CustomAiAssistantConfig {
  kind: CustomAiAssistantKind;
  extensionId: string;
  extensionName: string;
  insertCommands?: InsertCommandEntry[];
  focusAndPasteCommands?: string[];
  focusCommands?: string[];
}

interface RawCustomAiAssistantEntry {
  extensionId?: unknown;
  extensionName?: unknown;
  insertCommands?: unknown;
  focusAndPasteCommands?: unknown;
  focusCommands?: unknown;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNonEmptyStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => isNonEmptyString(item));

/**
 * Validate and normalize a single insertCommands entry.
 * Plain strings become { command: str }. Objects must have a string command field.
 */
const normalizeInsertCommandEntry = (item: unknown): InsertCommandEntry | undefined => {
  if (typeof item === 'string' && item.trim().length > 0) {
    return { command: item };
  }
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    if (typeof obj.command === 'string' && obj.command.trim().length > 0) {
      return obj.args !== undefined
        ? { command: obj.command, args: obj.args }
        : { command: obj.command };
    }
  }
  return undefined;
};

/**
 * Parse and normalize an insertCommands array from raw config.
 * Returns undefined if the array is absent/empty, or a normalized array skipping invalid entries.
 */
const parseInsertCommands = (
  raw: unknown,
  index: number,
  logger: Logger,
): InsertCommandEntry[] | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }

  const entries: InsertCommandEntry[] = [];
  for (const [itemIndex, item] of raw.entries()) {
    const normalized = normalizeInsertCommandEntry(item);
    if (normalized) {
      entries.push(normalized);
    } else {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index, itemIndex },
        `Skipping customAiAssistants[${index}].insertCommands[${itemIndex}]: invalid entry`,
      );
    }
  }

  return entries.length > 0 ? entries : undefined;
};

/**
 * Parse an optional string array field. Returns undefined if absent or invalid.
 * Logs a warning when the value exists but is malformed.
 */
const parseOptionalStringArray = (
  raw: unknown,
  fieldName: string,
  index: number,
  logger: Logger,
): string[] | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  if (isNonEmptyStringArray(raw)) {
    return raw;
  }
  logger.warn(
    { fn: 'parseCustomAiAssistants', index, fieldName },
    `Skipping customAiAssistants[${index}].${fieldName}: must be a non-empty array of strings`,
  );
  return undefined;
};

/**
 * Parse and validate custom AI assistant entries from user settings.
 * Invalid entries are logged as warnings and skipped — never crash the extension.
 *
 * Three command tiers are supported (all optional, at least one required):
 * - insertCommands: Tier 1 — direct text delivery via command argument
 * - focusAndPasteCommands: Tier 2 — focus + auto-paste via clipboard
 * - focusCommands: Tier 3 — focus only, user pastes manually
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

    const { extensionId: rawExtensionId, extensionName: rawExtensionName } = entry;

    if (!isNonEmptyString(rawExtensionId)) {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index, extensionId: rawExtensionId },
        `Skipping customAiAssistants[${index}]: extensionId must be a non-empty string`,
      );
      continue;
    }

    if (!isNonEmptyString(rawExtensionName)) {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index, extensionName: rawExtensionName },
        `Skipping customAiAssistants[${index}]: extensionName must be a non-empty string`,
      );
      continue;
    }

    const extensionId = rawExtensionId.trim();
    const extensionName = rawExtensionName.trim();

    const insertCommands = parseInsertCommands(entry.insertCommands, index, logger);
    const focusAndPasteCommands = parseOptionalStringArray(
      entry.focusAndPasteCommands,
      'focusAndPasteCommands',
      index,
      logger,
    );
    const focusCommands = parseOptionalStringArray(
      entry.focusCommands,
      'focusCommands',
      index,
      logger,
    );

    if (!insertCommands && !focusAndPasteCommands && !focusCommands) {
      logger.warn(
        { fn: 'parseCustomAiAssistants', index },
        `Skipping customAiAssistants[${index}]: at least one of insertCommands, focusAndPasteCommands, or focusCommands must be a non-empty array`,
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

    const config: CustomAiAssistantConfig = {
      kind: `custom-ai:${extensionId}`,
      extensionId,
      extensionName,
    };
    if (insertCommands) config.insertCommands = insertCommands;
    if (focusAndPasteCommands) config.focusAndPasteCommands = focusAndPasteCommands;
    if (focusCommands) config.focusCommands = focusCommands;

    results.push(config);
  }

  if (results.length > 0) {
    logger.info(
      {
        fn: 'parseCustomAiAssistants',
        count: results.length,
        ids: results.map((r) => r.extensionId),
      },
      `Loaded ${results.length} custom AI assistant(s)`,
    );
  }

  return results;
};
