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
// Configuration Key Enum
// ============================================================================

/**
 * Enum for delimiter configuration keys
 * Prevents typos and enables type-safe config access
 *
 * Use this enum instead of string literals when accessing VSCode config:
 * - config.get(DelimiterConfigKey.Line) instead of config.get('delimiterLine')
 * - config.inspect(DelimiterConfigKey.Hash) instead of config.inspect('delimiterHash')
 */
export enum DelimiterConfigKey {
  Line = 'delimiterLine',
  Position = 'delimiterPosition',
  Hash = 'delimiterHash',
  Range = 'delimiterRange',
}

// ============================================================================
// Configuration Inspection Types
// ============================================================================

/**
 * Configuration inspection result
 * Simplified to string-only (YAGNI - we only use strings for delimiters)
 * Strong typing: key must be valid DelimiterConfig key
 *
 * Maps to VSCode's ConfigurationInspect but with:
 * - Removed generic (we only use strings)
 * - Strong typing for key field (keyof DelimiterConfig)
 */
export type ConfigInspection = {
  key: keyof DelimiterConfig;
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
