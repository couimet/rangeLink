import {
  type DelimiterConfig,
  RangeLinkError,
  validateDelimiter,
  validateSubstringConflicts,
  validateUniqueness,
} from 'rangelink-core-ts';

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates individual delimiter fields
 * Returns array of errors (empty if all valid)
 * Pure function - no logging, just validation
 *
 * Each field is validated independently:
 * - Line, Position, Range: validated as regular delimiters (isHash: false)
 * - Hash: validated as hash delimiter (isHash: true, must be single character)
 *
 * @param userLine - Line delimiter value from config
 * @param userPosition - Position delimiter value from config
 * @param userHash - Hash delimiter value from config
 * @param userRange - Range delimiter value from config
 * @returns Array of RangeLinkError (empty if all valid)
 */
export const validateDelimiterFields = (
  userLine: string,
  userPosition: string,
  userHash: string,
  userRange: string,
): RangeLinkError[] => {
  const errors: RangeLinkError[] = [];

  const lineResult = validateDelimiter(userLine, false);
  if (!lineResult.success) {
    errors.push(lineResult.error);
  }

  const positionResult = validateDelimiter(userPosition, false);
  if (!positionResult.success) {
    errors.push(positionResult.error);
  }

  const hashResult = validateDelimiter(userHash, true);
  if (!hashResult.success) {
    errors.push(hashResult.error);
  }

  const rangeResult = validateDelimiter(userRange, false);
  if (!rangeResult.success) {
    errors.push(rangeResult.error);
  }

  return errors;
};

/**
 * Validates delimiter uniqueness and substring conflicts
 * Returns array of errors (empty if valid)
 * Pure function - no logging, just validation
 *
 * Uses core validation functions that return Result types
 *
 * Checks:
 * - Uniqueness: All delimiters must be unique (case-insensitive)
 * - Substring conflicts: No delimiter can be a substring of another
 *
 * @param delimiters - Delimiter configuration to validate
 * @returns Array of RangeLinkError (empty if valid)
 */
export const validateDelimiterRelationships = (delimiters: DelimiterConfig): RangeLinkError[] => {
  const errors: RangeLinkError[] = [];

  // Check uniqueness using core validation
  const uniquenessResult = validateUniqueness(delimiters);
  if (!uniquenessResult.success) {
    errors.push(uniquenessResult.error);
  }

  // Check substring conflicts using core validation
  const substringResult = validateSubstringConflicts(delimiters);
  if (!substringResult.success) {
    errors.push(substringResult.error);
  }

  return errors;
};
