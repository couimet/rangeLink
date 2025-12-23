import type { ConfigGetter } from '../config/types';

/**
 * Minimal interface for IDE adapters that provide configuration access.
 * Decouples ConfigReader from concrete VscodeAdapter.
 */
export interface ConfigurationProvider {
  getConfiguration(section: string): ConfigGetter;
}
