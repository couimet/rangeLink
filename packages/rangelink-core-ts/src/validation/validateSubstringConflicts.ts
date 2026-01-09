import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import type { CoreResult } from '../types/CoreResult';
import { DelimiterConfig } from '../types/DelimiterConfig';
import { Result } from '../types/Result';

/**
 * Validates that no delimiter is a substring of another (case-insensitive)
 * Returns Result type for consistent error handling
 *
 * Substring conflicts create ambiguous parsing situations and must be prevented.
 * Checks all delimiter pairs to ensure no delimiter contains another as a substring.
 *
 * @param delimiters - The delimiter configuration to validate
 */
export const validateSubstringConflicts = (delimiters: DelimiterConfig): CoreResult<void> => {
  const values = [delimiters.line, delimiters.position, delimiters.hash, delimiters.range];

  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;

      const a = values[i].toLowerCase();
      const b = values[j].toLowerCase();

      if (a.length === 0 || b.length === 0) continue;

      if (a.includes(b)) {
        return Result.err(
          new RangeLinkError({
            code: RangeLinkErrorCodes.CONFIG_DELIMITER_SUBSTRING_CONFLICT,
            message: 'Delimiters cannot be substrings of each other',
            functionName: 'validateSubstringConflicts',
            details: { delimiters },
          }),
        );
      }
    }
  }

  return Result.ok(undefined);
};

/**
 * Checks if any delimiter is a substring of another (case-insensitive)
 * Returns boolean for backward compatibility
 *
 * @deprecated Use validateSubstringConflicts() for Result-based error handling
 * @param delimiters - The delimiter configuration to check
 * @returns true if any delimiter is a substring of another, false otherwise
 */
export const haveSubstringConflicts = (delimiters: DelimiterConfig): boolean => {
  return !validateSubstringConflicts(delimiters).success;
};
