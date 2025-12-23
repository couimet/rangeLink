import type { Logger } from 'barebone-logger';
import type { DelimiterConfig } from 'rangelink-core-ts';

import type { ErrorFeedbackProvider } from '../ide/ErrorFeedbackProvider';

import { loadDelimiterConfig } from './loadDelimiterConfig';
import type { ConfigGetter } from './types';

/**
 * Load delimiter configuration with user notification on validation errors.
 *
 * Encapsulates the pattern of loading delimiters, validating them,
 * and notifying the user if configuration is invalid.
 */
export const getDelimitersForExtension = (
  config: ConfigGetter,
  errorFeedbackProvider: ErrorFeedbackProvider,
  logger: Logger,
): DelimiterConfig => {
  const result = loadDelimiterConfig(config, logger);

  if (result.errors.length > 0) {
    void errorFeedbackProvider.showErrorMessage(
      'RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.',
    );
  }

  return result.delimiters;
};
