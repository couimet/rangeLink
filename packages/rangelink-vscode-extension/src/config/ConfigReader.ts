import type { Logger } from 'barebone-logger';

import { SETTING_NAMESPACE } from '../constants/settingKeys';
import type { PaddingMode } from '../utils/applySmartPadding';
import { loadDelimiterConfig } from './loadDelimiterConfig';
import type { ConfigGetter, LoadDelimiterConfigResult } from './types';

/**
 * Factory function type for obtaining fresh configuration.
 * Called on every read to enable dynamic configuration updates.
 */
export type ConfigGetterFactory = () => ConfigGetter;

/**
 * Minimal interface for IDE adapters that provide configuration access.
 * Allows ConfigReader to work with any IDE adapter implementation.
 */
export interface ConfigurationProvider {
  getConfiguration(section: string): ConfigGetter;
}

/**
 * Centralized configuration reader for RangeLink extension settings.
 *
 * Encapsulates all configuration access with consistent logging and type safety.
 * Uses a factory function to obtain fresh configuration on every read, enabling
 * dynamic configuration updates without extension reload.
 *
 * Key design decisions:
 * - Factory function `() => ConfigGetter` instead of static ConfigGetter
 *   enables fresh reads (foundation for Issue #43 dynamic config)
 * - All reads logged at DEBUG level for troubleshooting
 * - Typed convenience methods for common settings
 */
export class ConfigReader {
  /**
   * Create a ConfigReader with the standard RangeLink configuration namespace.
   *
   * @param ideAdapter - IDE adapter providing configuration access
   * @param logger - Logger for debug output
   * @returns Configured ConfigReader instance
   */
  static create(ideAdapter: ConfigurationProvider, logger: Logger): ConfigReader {
    return new ConfigReader(() => ideAdapter.getConfiguration(SETTING_NAMESPACE), logger);
  }

  private constructor(
    private readonly getConfig: ConfigGetterFactory,
    private readonly logger: Logger,
  ) {}

  /**
   * Read a setting with fallback to default value.
   *
   * @param key - Setting key (relative to 'rangelink.' namespace)
   * @param defaultValue - Default value if setting is not configured
   * @returns The configured value or default
   */
  getSetting<T>(key: string, defaultValue: T): T {
    const config = this.getConfig();
    const value = config.get<T>(key);

    if (value === undefined) {
      this.logger.debug(
        { fn: 'ConfigReader.getSetting', key },
        `No ${key} configured, using default: ${String(defaultValue)}`,
      );
      return defaultValue;
    }

    this.logger.debug(
      { fn: 'ConfigReader.getSetting', key, value },
      'Using configured value',
    );
    return value;
  }

  /**
   * Read a PaddingMode setting with fallback to default.
   *
   * Typed convenience method for padding mode settings.
   *
   * @param key - Setting key (e.g., 'smartPadding.pasteLink')
   * @param defaultValue - Default padding mode
   * @returns The configured padding mode or default
   */
  getPaddingMode(key: string, defaultValue: PaddingMode): PaddingMode {
    return this.getSetting<PaddingMode>(key, defaultValue);
  }

  /**
   * Load and validate delimiter configuration.
   *
   * Gets fresh configuration on every call, enabling dynamic updates.
   * Validates all delimiter settings and falls back to defaults on error.
   *
   * @returns Result with delimiters, sources, and any validation errors
   */
  getDelimiters(): LoadDelimiterConfigResult {
    const config = this.getConfig();
    return loadDelimiterConfig(config, this.logger);
  }
}
