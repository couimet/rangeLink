/**
 * Single source of truth for VSCode setting keys for all RangeLink extension settings.
 *
 * Keys are relative to the SETTING_NAMESPACE (used with getConfiguration()).
 * Keep entries sorted alphabetically by constant name within each section.
 */

// =============================================================================
// Configuration Namespace
// =============================================================================

export const SETTING_NAMESPACE = 'rangelink';

// =============================================================================
// Delimiter Settings
// =============================================================================

export const SETTING_DELIMITER_HASH = 'delimiterHash';
export const SETTING_DELIMITER_LINE = 'delimiterLine';
export const SETTING_DELIMITER_POSITION = 'delimiterPosition';
export const SETTING_DELIMITER_RANGE = 'delimiterRange';
