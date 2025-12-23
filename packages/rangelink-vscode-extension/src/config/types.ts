import type { DelimiterConfig, RangeLinkError } from 'rangelink-core-ts';

// ============================================================================
// Configuration Source Types
// ============================================================================

/**
 * Configuration source type - explicit and frozen
 * Indicates where a delimiter configuration value originated from
 */
export type ConfigSource = 'default' | 'user' | 'workspace' | 'workspaceFolder';

/**
 * Configuration sources - symmetric with DelimiterConfig
 * Keys match DelimiterConfig exactly: line, position, hash, range
 *
 * This provides a 1:1 mapping between delimiter values and their sources,
 * making it easy to trace where each delimiter came from.
 */
export type DelimiterConfigSources = {
  [K in keyof DelimiterConfig]: ConfigSource;
};

// ============================================================================
// Configuration Inspection Types
// ============================================================================

/**
 * Configuration inspection result
 * Simplified to string-only (YAGNI - we only use strings for delimiters)
 *
 * Maps to VSCode's ConfigurationInspect but with:
 * - Removed generic (we only use strings)
 * - key is string to match VSCode's WorkspaceConfiguration.inspect()
 */
export type ConfigInspection = {
  key: string;
  defaultValue?: string;
  globalValue?: string;
  workspaceValue?: string;
  workspaceFolderValue?: string;
};

/**
 * Abstracted configuration getter interface
 * Decouples from VSCode-specific WorkspaceConfiguration API
 *
 * This allows testing with simple mock objects instead of mocking VSCode.
 * Extension code adapts vscode.workspace.getConfiguration() to this interface.
 */
export interface ConfigGetter {
  get<T>(key: string): T | undefined;
  inspect(key: string): ConfigInspection | undefined;
}

/**
 * Factory function type for obtaining fresh configuration.
 * Called on every read to enable dynamic configuration updates.
 */
export type ConfigGetterFactory = () => ConfigGetter;

/**
 * Minimal interface for IDE adapters that provide configuration access.
 * Decouples ConfigReader from concrete VscodeAdapter.
 */
export interface ConfigurationProvider {
  getConfiguration(section: string): ConfigGetter;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of loading delimiter configuration
 *
 * Note: No hadErrors boolean - caller checks errors.length > 0
 *
 * @property delimiters - The loaded delimiter configuration (defaults if errors)
 * @property sources - Where each delimiter value came from
 * @property errors - Array of validation errors (empty array = success)
 */
export type LoadDelimiterConfigResult = {
  delimiters: DelimiterConfig;
  sources: DelimiterConfigSources;
  errors: RangeLinkError[];
};
