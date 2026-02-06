import type { Logger } from 'barebone-logger';

import { SETTING_NAMESPACE } from '../constants/settingKeys';
import type { ConfigurationProvider } from '../ide/ConfigurationProvider';
import type { PaddingMode } from '../utils/applySmartPadding';

import type { ConfigGetter, ConfigGetterFactory, ConfigInspection } from './types';

/**
 * Facade for RangeLink extension configuration access.
 *
 * Encapsulates namespace and provides typed, logged access to settings.
 * Uses factory function for fresh reads (foundation for Issue #43).
 */
export class ConfigReader implements ConfigGetter {
  private constructor(
    private readonly getConfig: ConfigGetterFactory,
    private readonly logger: Logger,
  ) {}

  /**
   * Create a ConfigReader with the standard RangeLink configuration namespace.
   */
  static create(configProvider: ConfigurationProvider, logger: Logger): ConfigReader {
    return new ConfigReader(() => configProvider.getConfiguration(SETTING_NAMESPACE), logger);
  }

  /**
   * Read a setting with fallback to default value.
   *
   * @param key - Setting key (relative to 'rangelink.' namespace)
   * @param defaultValue - Default value if setting is not configured
   * @returns The configured value or default
   */
  getWithDefault<T>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);

    if (value === undefined) {
      this.logger.debug(
        { fn: 'ConfigReader.getSetting', key, defaultValue },
        `No ${key} configured, using default: ${String(defaultValue)}`,
      );
      return defaultValue;
    }

    this.logger.debug({ fn: 'ConfigReader.getSetting', key, value }, 'Using configured value');
    return value;
  }

  get<T>(key: string): T | undefined {
    return this.getConfig().get<T>(key);
  }

  inspect(key: string): ConfigInspection | undefined {
    const config = this.getConfig();
    return config.inspect(key);
  }

  /**
   * Read a PaddingMode setting with fallback to default.
   */
  getPaddingMode(key: string, defaultValue: PaddingMode): PaddingMode {
    return this.getWithDefault<PaddingMode>(key, defaultValue);
  }

  /**
   * Read a boolean setting with fallback to default.
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    return this.getWithDefault<boolean>(key, defaultValue);
  }
}
