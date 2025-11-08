import type { DelimiterConfig } from 'rangelink-core-ts';

import type { ConfigGetter, ConfigInspection, ConfigSource, DelimiterConfigSources } from './types';
import { DelimiterConfigKey } from './types';

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
 * Uses DelimiterConfigKey enum to avoid string typos
 *
 * @param config - Configuration getter interface
 * @returns Source for each delimiter field
 */
export const determineAllSources = (config: ConfigGetter): DelimiterConfigSources => {
  return {
    line: determineSource(config.inspect(DelimiterConfigKey.Line)),
    position: determineSource(config.inspect(DelimiterConfigKey.Position)),
    hash: determineSource(config.inspect(DelimiterConfigKey.Hash)),
    range: determineSource(config.inspect(DelimiterConfigKey.Range)),
  };
};
