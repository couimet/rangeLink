import type { Logger } from 'barebone-logger';
import type { DelimiterConfig, RangeLinkError } from 'rangelink-core-ts';
import { RangeLinkMessageCode } from 'rangelink-core-ts';

import type { DelimiterConfigSources } from './types';

/**
 * Logs validation errors in a structured way
 * Each error is logged with full error object in context
 * Uses correct function name ('logValidationErrors')
 *
 * @param logger - Logger instance
 * @param errors - Array of validation errors to log
 */
export const logValidationErrors = (logger: Logger, errors: RangeLinkError[]): void => {
  for (const error of errors) {
    logger.error(
      { fn: 'logValidationErrors', error }, // Full error object in context
      error.message, // Human-readable message
    );
  }
};

/**
 * Logs successful configuration load with sources
 * All logging happens in one place at the end
 * Uses structured context + descriptive message (Option C)
 *
 * @param logger - Logger instance
 * @param delimiters - Loaded delimiter configuration
 * @param sources - Source for each delimiter field
 */
export const logSuccessfulConfig = (
  logger: Logger,
  delimiters: DelimiterConfig,
  sources: DelimiterConfigSources,
): void => {
  logger.info(
    { fn: 'logSuccessfulConfig', code: RangeLinkMessageCode.CONFIG_LOADED },
    'Delimiter configuration loaded:',
  );

  logger.info(
    { fn: 'logSuccessfulConfig', field: 'line', source: sources.line },
    `  - Line delimiter: '${delimiters.line}' (from ${sources.line})`,
  );

  logger.info(
    { fn: 'logSuccessfulConfig', field: 'position', source: sources.position },
    `  - Position delimiter: '${delimiters.position}' (from ${sources.position})`,
  );

  logger.info(
    { fn: 'logSuccessfulConfig', field: 'hash', source: sources.hash },
    `  - Hash delimiter: '${delimiters.hash}' (from ${sources.hash})`,
  );

  logger.info(
    { fn: 'logSuccessfulConfig', field: 'range', source: sources.range },
    `  - Range delimiter: '${delimiters.range}' (from ${sources.range})`,
  );

  logger.info(
    { fn: 'logSuccessfulConfig' },
    `  - Column mode: indicated by double hash delimiter (${delimiters.hash}${delimiters.hash})`,
  );
};
