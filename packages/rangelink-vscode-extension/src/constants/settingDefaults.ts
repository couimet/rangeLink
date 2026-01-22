/**
 * Single source of truth for default values for all RangeLink extension settings.
 *
 * Must match defaults defined in package.json contributes.configuration.
 * Keep entries sorted alphabetically by constant name within each section.
 */

import { DEFAULT_DELIMITERS } from 'rangelink-core-ts';

import type { PaddingMode } from '../utils/applySmartPadding';

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ SECTIONS BELOW MUST BE IN ALPHABETICAL ORDER (A → Z)                      │
// └───────────────────────────────────────────────────────────────────────────┘

// =============================================================================
// Delimiter Defaults (re-exported from core for extension use)
// =============================================================================

export const DEFAULT_DELIMITER_HASH = DEFAULT_DELIMITERS.hash;
export const DEFAULT_DELIMITER_LINE = DEFAULT_DELIMITERS.line;
export const DEFAULT_DELIMITER_POSITION = DEFAULT_DELIMITERS.position;
export const DEFAULT_DELIMITER_RANGE = DEFAULT_DELIMITERS.range;

// =============================================================================
// Smart Padding Defaults
// =============================================================================

export const DEFAULT_SMART_PADDING_PASTE_BOOKMARK: PaddingMode = 'both';
export const DEFAULT_SMART_PADDING_PASTE_CONTENT: PaddingMode = 'none';
export const DEFAULT_SMART_PADDING_PASTE_FILE_PATH: PaddingMode = 'both';
export const DEFAULT_SMART_PADDING_PASTE_LINK: PaddingMode = 'both';

// =============================================================================
// Terminal Picker Defaults
// =============================================================================

export const DEFAULT_TERMINAL_PICKER_MAX_INLINE = 5;

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ SECTIONS ABOVE MUST BE IN ALPHABETICAL ORDER (A → Z)                      │
// └───────────────────────────────────────────────────────────────────────────┘
