import { DEFAULT_DELIMITERS, type Logger, RangeLinkMessageCode } from 'rangelink-core-ts';

import { logSuccessfulConfig, logValidationErrors } from './logging';
import { determineAllSources } from './sources';
import type { ConfigGetter, LoadDelimiterConfigResult } from './types';
import { DelimiterConfigKey } from './types';
import { validateDelimiterFields, validateDelimiterRelationships } from './validation';

/**
 * Validates and loads delimiter configuration
 * Accumulates all errors, logs once at end
 * Pure orchestration with isolated side effects (logging)
 *
 * Error accumulation strategy: Validate relationships only if all fields valid (Option C)
 *
 * @param config - Configuration getter (abstracted from VSCode)
 * @param logger - Logger for output
 * @returns Result with delimiters, sources, and errors (empty array if success)
 */
export const loadDelimiterConfig = (
  config: ConfigGetter,
  logger: Logger,
): LoadDelimiterConfigResult => {
  // Get raw config values using enum keys (type-safe, prevents typos)
  const userLine = config.get<string>(DelimiterConfigKey.Line) ?? '';
  const userPosition = config.get<string>(DelimiterConfigKey.Position) ?? '';
  const userHash = config.get<string>(DelimiterConfigKey.Hash) ?? '';
  const userRange = config.get<string>(DelimiterConfigKey.Range) ?? '';

  // Validate individual fields (accumulate errors)
  const fieldErrors = validateDelimiterFields(userLine, userPosition, userHash, userRange);

  // If field validation failed, log and return defaults
  if (fieldErrors.length > 0) {
    logValidationErrors(logger, fieldErrors);
    logger.info(
      { fn: 'loadDelimiterConfig', code: RangeLinkMessageCode.CONFIG_USING_DEFAULTS },
      'Using default delimiters due to validation errors',
    );

    return {
      delimiters: DEFAULT_DELIMITERS,
      sources: { line: 'default', position: 'default', hash: 'default', range: 'default' },
      errors: fieldErrors,
    };
  }

  // Build user delimiter config (all fields valid at this point)
  const userDelimiters = {
    line: userLine,
    position: userPosition,
    hash: userHash,
    range: userRange,
  };

  // Validate relationships ONLY if all fields valid (Option C)
  const relationshipErrors = validateDelimiterRelationships(userDelimiters);

  if (relationshipErrors.length > 0) {
    logValidationErrors(logger, relationshipErrors);
    logger.info(
      { fn: 'loadDelimiterConfig', code: RangeLinkMessageCode.CONFIG_USING_DEFAULTS },
      'Using default delimiters due to validation errors',
    );

    return {
      delimiters: DEFAULT_DELIMITERS,
      sources: { line: 'default', position: 'default', hash: 'default', range: 'default' },
      errors: relationshipErrors,
    };
  }

  // Success - determine sources
  const sources = determineAllSources(config);

  // Log success info (all at once)
  logSuccessfulConfig(logger, userDelimiters, sources);

  return {
    delimiters: userDelimiters,
    sources,
    errors: [], // Empty array = success
  };
};
