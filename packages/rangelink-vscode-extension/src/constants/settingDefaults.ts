/**
 * Single source of truth for default values for all RangeLink extension settings.
 *
 * Must match defaults defined in package.json contributes.configuration.
 * Keep entries sorted alphabetically by constant name within each section.
 */

import { DEFAULT_DELIMITERS } from 'rangelink-core-ts';

// =============================================================================
// Delimiter Defaults (re-exported from core for extension use)
// =============================================================================

export const DEFAULT_DELIMITER_HASH = DEFAULT_DELIMITERS.hash;
export const DEFAULT_DELIMITER_LINE = DEFAULT_DELIMITERS.line;
export const DEFAULT_DELIMITER_POSITION = DEFAULT_DELIMITERS.position;
export const DEFAULT_DELIMITER_RANGE = DEFAULT_DELIMITERS.range;
