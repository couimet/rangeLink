import { RESERVED_CHARS } from '../constants/RESERVED_CHARS';
import { DelimiterValidationError } from '../types/DelimiterValidationError';
import { Err, Ok, Result } from '../types/Result';

/**
 * Validate a delimiter value and return a result.
 *
 * @param value The delimiter value to validate
 * @param isHash Optional flag to indicate if this is a hash delimiter (must be single character)
 * @returns Result<void, DelimiterValidationError> - Ok if valid, Err with error code otherwise
 */
export function validateDelimiter(
  value: string,
  isHash: boolean = false,
): Result<void, DelimiterValidationError> {
  if (!value || value.trim() === '') {
    return Err(DelimiterValidationError.Empty);
  }

  // Hash delimiter must be exactly 1 character
  if (isHash && value.length !== 1) {
    return Err(DelimiterValidationError.HashNotSingleChar);
  }

  // Must not contain digits
  if (/\d/.test(value)) {
    return Err(DelimiterValidationError.ContainsDigits);
  }

  // Must not contain whitespace
  if (/\s/.test(value)) {
    return Err(DelimiterValidationError.ContainsWhitespace);
  }

  // Must not contain any reserved characters anywhere
  for (const ch of RESERVED_CHARS) {
    if (value.includes(ch)) {
      return Err(DelimiterValidationError.ContainsReservedChar);
    }
  }

  return Ok(undefined);
}
