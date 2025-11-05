/**
 * Centralized message codes for all RangeLink messages.
 * Uses descriptive values for better developer experience and log readability.
 * These codes enable future i18n support by decoupling message identification from formatting.
 *
 * Organized by human-readable categories: CONFIG, BYOD, etc.
 * Values match keys exactly for simplicity and i18n mapping.
 *
 * Coverage: This enum will achieve natural test coverage when i18n is implemented,
 * as translation maps must include all keys. See ROADMAP.md Phase 4.5J for details.
 */
export enum RangeLinkMessageCode {
  // Keep alphabetical order on this file for ease of maintenance; logical grouping will help with readability.

  // BYOD (Bring Your Own Delimiters) Parsing
  BYOD_DELIMITER_VALIDATION = 'BYOD_DELIMITER_VALIDATION',
  BYOD_EXTRA_DELIMITER = 'BYOD_EXTRA_DELIMITER',
  BYOD_FORMAT_MISMATCH = 'BYOD_FORMAT_MISMATCH',
  BYOD_HASH_INVALID = 'BYOD_HASH_INVALID',
  BYOD_INVALID_FORMAT = 'BYOD_INVALID_FORMAT',
  BYOD_POSITION_FROM_DEFAULT = 'BYOD_POSITION_FROM_DEFAULT',
  BYOD_POSITION_FROM_LOCAL = 'BYOD_POSITION_FROM_LOCAL',
  BYOD_POSITION_RECOVERY_FAILED = 'BYOD_POSITION_RECOVERY_FAILED',
  BYOD_RECTANGULAR_MODE_DETECTION = 'BYOD_RECTANGULAR_MODE_DETECTION',

  // Configuration
  CONFIG_DELIMITER_DIGITS = 'CONFIG_DELIMITER_DIGITS',
  CONFIG_DELIMITER_EMPTY = 'CONFIG_DELIMITER_EMPTY',
  CONFIG_DELIMITER_INVALID = 'CONFIG_DELIMITER_INVALID',
  CONFIG_DELIMITER_NOT_UNIQUE = 'CONFIG_DELIMITER_NOT_UNIQUE',
  CONFIG_DELIMITER_RESERVED = 'CONFIG_DELIMITER_RESERVED',
  CONFIG_DELIMITER_SUBSTRING_CONFLICT = 'CONFIG_DELIMITER_SUBSTRING_CONFLICT',
  CONFIG_DELIMITER_WHITESPACE = 'CONFIG_DELIMITER_WHITESPACE',
  CONFIG_HASH_NOT_SINGLE_CHAR = 'CONFIG_HASH_NOT_SINGLE_CHAR',
  CONFIG_LOADED = 'CONFIG_LOADED',
  CONFIG_UNKNOWN = 'CONFIG_UNKNOWN',
  CONFIG_USING_DEFAULTS = 'CONFIG_USING_DEFAULTS',

  // Keep alphabetical order on this file for ease of maintenance; logical grouping will help with readability.
}
