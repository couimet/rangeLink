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

// =============================================================================
// Smart Padding Settings
// =============================================================================

export const SETTING_SMART_PADDING_PASTE_BOOKMARK = 'smartPadding.pasteBookmark';
export const SETTING_SMART_PADDING_PASTE_CONTENT = 'smartPadding.pasteContent';
export const SETTING_SMART_PADDING_PASTE_FILE_PATH = 'smartPadding.pasteFilePath';
export const SETTING_SMART_PADDING_PASTE_LINK = 'smartPadding.pasteLink';

// =============================================================================
// Terminal Picker Settings
// =============================================================================

export const SETTING_TERMINAL_PICKER_MAX_INLINE = 'terminalPicker.maxInline';
