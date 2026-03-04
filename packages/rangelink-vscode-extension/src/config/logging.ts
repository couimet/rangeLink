import type { Logger } from 'barebone-logger';
import type { DelimiterConfig, RangeLinkError } from 'rangelink-core-ts';

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
    {
      fn: 'logSuccessfulConfig',
      delimiters: {
        line: { value: delimiters.line, source: sources.line },
        position: { value: delimiters.position, source: sources.position },
        hash: { value: delimiters.hash, source: sources.hash },
        range: { value: delimiters.range, source: sources.range },
      },
    },
    `Delimiter configuration loaded: line='${delimiters.line}' position='${delimiters.position}' hash='${delimiters.hash}' range='${delimiters.range}' columnMode='${delimiters.hash}${delimiters.hash}'`,
  );
};
