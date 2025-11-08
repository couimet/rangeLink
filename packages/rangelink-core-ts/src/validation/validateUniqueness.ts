import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { Err, Ok, Result } from '../types/Result';

/**
 * Validates that all delimiters are unique (case-insensitive)
 * Returns Result type for consistent error handling
 *
 * Checks all delimiter values for uniqueness, treating them as case-insensitive.
 * This prevents user errors from inconsistent casing (e.g., "L" vs "l").
 *
 * @param delimiters - The delimiter configuration to validate
 * @returns Result<void, RangeLinkError> - Ok if unique, Err with RangeLinkError otherwise
 */
export const validateUniqueness = (delimiters: DelimiterConfig): Result<void, RangeLinkError> => {
  const values = [delimiters.line, delimiters.position, delimiters.hash, delimiters.range];
  const lowerCaseValues = values.map((v) => v.toLowerCase());
  const isUnique = new Set(lowerCaseValues).size === lowerCaseValues.length;

  if (!isUnique) {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.CONFIG_DELIMITER_NOT_UNIQUE,
        message: 'Delimiters must be unique (case-insensitive)',
        functionName: 'validateUniqueness',
        details: { delimiters },
      }),
    );
  }

  return Ok(undefined);
};

/**
 * Checks if all delimiters are unique (case-insensitive)
 * Returns boolean for backward compatibility
 *
 * @deprecated Use validateUniqueness() for Result-based error handling
 * @param delimiters - The delimiter configuration to check
 * @returns true if all delimiters are unique, false otherwise
 */
export const areDelimitersUnique = (delimiters: DelimiterConfig): boolean => {
  return validateUniqueness(delimiters).success;
};
