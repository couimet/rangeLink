import { SharedErrorCodes } from './sharedErrorCodes';

/**
 * RangeLink-specific error codes.
 *
 * Architecture principles:
 * - No ERR_ prefix: If defined here, it's an error
 * - No WARN_ codes: Warning is a logging level, not an error type
 * - Values are descriptive strings (same as keys) for clear context in logs
 * - Following SharedErrorCodes pattern: VALIDATION = 'VALIDATION'
 * - Informational messages (MSG_xxxx) are in RangeLinkMessageCode for i18n
 *
 * When someone sees an error in logs or catches an exception, they should
 * immediately understand what went wrong without looking up code mappings.
 *
 * Please keep alphabetical order within each category for ease of maintenance.
 */
export enum RangeLinkSpecificCodes {
  //
  // Configuration errors
  //
  CONFIG_DELIMITER_DIGITS = 'CONFIG_DELIMITER_DIGITS',
  CONFIG_DELIMITER_EMPTY = 'CONFIG_DELIMITER_EMPTY',
  CONFIG_DELIMITER_INVALID = 'CONFIG_DELIMITER_INVALID',
  CONFIG_DELIMITER_NOT_UNIQUE = 'CONFIG_DELIMITER_NOT_UNIQUE',
  CONFIG_DELIMITER_RESERVED = 'CONFIG_DELIMITER_RESERVED',
  CONFIG_DELIMITER_SUBSTRING_CONFLICT = 'CONFIG_DELIMITER_SUBSTRING_CONFLICT',
  CONFIG_DELIMITER_WHITESPACE = 'CONFIG_DELIMITER_WHITESPACE',
  CONFIG_HASH_NOT_SINGLE_CHAR = 'CONFIG_HASH_NOT_SINGLE_CHAR',
  /**
   * @deprecated Tech debt: Catch-all error code defeats descriptive error handling.
   * See docs/ROADMAP.md Phase 4.5I for elimination plan.
   * TODO: Replace with specific error codes for each failure scenario.
   */
  CONFIG_UNKNOWN = 'CONFIG_UNKNOWN',

  //
  // BYOD parsing errors
  //
  BYOD_DELIMITER_VALIDATION = 'BYOD_DELIMITER_VALIDATION',
  BYOD_FORMAT_MISMATCH = 'BYOD_FORMAT_MISMATCH',
  BYOD_HASH_INVALID = 'BYOD_HASH_INVALID',
  BYOD_INVALID_FORMAT = 'BYOD_INVALID_FORMAT',
  BYOD_POSITION_RECOVERY_FAILED = 'BYOD_POSITION_RECOVERY_FAILED',
  BYOD_RECTANGULAR_MODE_DETECTION = 'BYOD_RECTANGULAR_MODE_DETECTION',

  //
  // Selection validation errors
  //
  SELECTION_BACKWARD_CHARACTER = 'SELECTION_BACKWARD_CHARACTER',
  SELECTION_BACKWARD_LINE = 'SELECTION_BACKWARD_LINE',
  SELECTION_EMPTY = 'SELECTION_EMPTY',
  SELECTION_NEGATIVE_COORDINATES = 'SELECTION_NEGATIVE_COORDINATES',
  SELECTION_NORMAL_MULTIPLE = 'SELECTION_NORMAL_MULTIPLE',
  SELECTION_RECTANGULAR_MISMATCHED_COLUMNS = 'SELECTION_RECTANGULAR_MISMATCHED_COLUMNS',
  SELECTION_RECTANGULAR_MULTILINE = 'SELECTION_RECTANGULAR_MULTILINE',
  SELECTION_RECTANGULAR_NON_CONTIGUOUS = 'SELECTION_RECTANGULAR_NON_CONTIGUOUS',
  SELECTION_RECTANGULAR_UNSORTED = 'SELECTION_RECTANGULAR_UNSORTED',
  SELECTION_UNKNOWN_TYPE = 'SELECTION_UNKNOWN_TYPE',
  SELECTION_ZERO_WIDTH = 'SELECTION_ZERO_WIDTH',
}

/**
 * Union type of all RangeLink error codes.
 * Combines project-specific codes with shared error codes.
 */
export type RangeLinkErrorCodes = RangeLinkSpecificCodes | SharedErrorCodes;

/**
 * Merged error codes object.
 * Spread SharedErrorCodes LAST to avoid override issues (see sharedErrorCodes.ts docs).
 */
export const RangeLinkErrorCodes = {
  ...RangeLinkSpecificCodes,
  ...SharedErrorCodes,
};
