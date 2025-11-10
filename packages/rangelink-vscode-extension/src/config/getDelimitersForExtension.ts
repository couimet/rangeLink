import type { Logger } from 'barebone-logger';
import { type DelimiterConfig } from 'rangelink-core-ts';

import type { IdeAdapter } from '../ide/IdeAdapter';
import { loadDelimiterConfig } from './loadDelimiterConfig';
import type { ConfigGetter } from './types';

/**
 * Loads delimiter configuration from workspace settings.
 *
 * Pure function that accepts dependencies as parameters for better testability.
 * Handles configuration-specific concerns:
 * - Validates configuration using loadDelimiterConfig
 * - Shows error notification via ideAdapter if configuration is invalid
 * - Returns default delimiters on error (never throws)
 *
 * @param config - Configuration getter (e.g., VSCode WorkspaceConfiguration)
 * @param ideAdapter - IDE adapter for showing error notifications
 * @param logger - Logger instance for debugging
 * @returns DelimiterConfig - validated delimiters (defaults if invalid)
 */
export const getDelimitersForExtension = (
  config: ConfigGetter,
  ideAdapter: IdeAdapter,
  logger: Logger,
): DelimiterConfig => {
  const result = loadDelimiterConfig(config, logger);

  // Show error notification if there were validation errors
  if (result.errors.length > 0) {
    void ideAdapter.showErrorMessage(
      `RangeLink: Invalid delimiter configuration. Using defaults. Check Output → RangeLink for details.`,
    );
  }

  return result.delimiters;
};
