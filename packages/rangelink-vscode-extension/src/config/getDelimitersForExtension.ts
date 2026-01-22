import type { Logger } from 'barebone-logger';
import type { DelimiterConfig } from 'rangelink-core-ts';

import type { ErrorFeedbackProvider } from '../ide/ErrorFeedbackProvider';
import { MessageCode } from '../types';
import { formatMessage } from '../utils';

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
      formatMessage(MessageCode.ERROR_INVALID_DELIMITER_CONFIG),
    );
  }

  return result.delimiters;
};
