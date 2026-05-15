import { DEFAULT_DELIMITERS } from 'rangelink-core-ts';

import type { ClipboardPreservationMode } from '../types/ClipboardPreservationMode';
import type { PaddingMode } from '../utils/applySmartPadding';

/**
 * Single source of truth for default values for all RangeLink extension settings.
 *
 * Must match defaults defined in package.json contributes.configuration.
 * Keep entries sorted alphabetically by constant name within each section.
 */

// =============================================================================
// Destination Defaults
// =============================================================================

export const DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS = 300;
export const DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS = 1500;
export const DEFAULT_DESTINATIONS_GEMINI_COLD_REFOCUS_INTERVAL_MS = 300;
export const DEFAULT_DESTINATIONS_GEMINI_COLD_START_DELAY_MS = 2500;

// =============================================================================
// Feature Flag Defaults — TODO: #366 remove when bookmarks graduates from beta
// =============================================================================

export const DEFAULT_FEATURES_BOOKMARKS_ENABLED = false;

// =============================================================================
// Clipboard Defaults
// =============================================================================

export const DEFAULT_CLIPBOARD_PRESERVE: ClipboardPreservationMode = 'always';

// =============================================================================
// Delimiter Defaults (re-exported from core for extension use)
// =============================================================================

export const DEFAULT_DELIMITER_HASH = DEFAULT_DELIMITERS.hash;
export const DEFAULT_DELIMITER_LINE = DEFAULT_DELIMITERS.line;
export const DEFAULT_DELIMITER_POSITION = DEFAULT_DELIMITERS.position;
export const DEFAULT_DELIMITER_RANGE = DEFAULT_DELIMITERS.range;

// =============================================================================
// Navigation Defaults
// =============================================================================

export const DEFAULT_NAVIGATION_SHOW_CLAMPING_WARNING = true;
export const DEFAULT_NAVIGATION_SHOW_NAVIGATED_TOAST = true;

// =============================================================================
// Dirty Buffer Warning Defaults
// =============================================================================

export const DEFAULT_WARN_ON_DIRTY_BUFFER = true;

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
