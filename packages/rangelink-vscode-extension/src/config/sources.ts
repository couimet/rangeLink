import {
  SETTING_DELIMITER_HASH,
  SETTING_DELIMITER_LINE,
  SETTING_DELIMITER_POSITION,
  SETTING_DELIMITER_RANGE,
} from '../constants';

import type { ConfigGetter, ConfigInspection, ConfigSource, DelimiterConfigSources } from './types';

/**
 * Determines config source from inspection data
 * Pure function, no side effects
 *
 * Priority order: workspaceFolder > workspace > user > default
 *
 * @param inspect - Configuration inspection result
 * @returns Source of the configuration value
 */
export const determineSource = (inspect: ConfigInspection | undefined): ConfigSource => {
  if (inspect?.workspaceFolderValue !== undefined) return 'workspaceFolder';
  if (inspect?.workspaceValue !== undefined) return 'workspace';
  if (inspect?.globalValue !== undefined) return 'user';
  return 'default';
};

/**
 * Determines sources for all delimiter fields
 * Pure function, no side effects
 *
 * @param config - Configuration getter interface
 * @returns Source for each delimiter field
 */
export const determineAllSources = (config: ConfigGetter): DelimiterConfigSources => {
  return {
    line: determineSource(config.inspect(SETTING_DELIMITER_LINE)),
    position: determineSource(config.inspect(SETTING_DELIMITER_POSITION)),
    hash: determineSource(config.inspect(SETTING_DELIMITER_HASH)),
    range: determineSource(config.inspect(SETTING_DELIMITER_RANGE)),
  };
};
