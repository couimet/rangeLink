import { RESERVED_CHARS } from '../constants/RESERVED_CHARS';
import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { Err, Ok, Result } from '../types/Result';

/**
 * Validate a delimiter value and return a result.
 *
 * @param value The delimiter value to validate
 * @param isHash Optional flag to indicate if this is a hash delimiter (must be single character)
 * @returns Result<void, RangeLinkError> - Ok if valid, Err with RangeLinkError otherwise
 */
export function validateDelimiter(
  value: string,
  isHash: boolean = false,
): Result<void, RangeLinkError> {
  if (!value || value.trim() === '') {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.CONFIG_DELIMITER_EMPTY,
        message: 'Delimiter must not be empty',
        functionName: 'validateDelimiter',
        details: { value, isHash },
      }),
    );
  }

  // Hash delimiter must be exactly 1 character
  if (isHash && value.length !== 1) {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.CONFIG_HASH_NOT_SINGLE_CHAR,
        message: 'Hash delimiter must be exactly one character',
        functionName: 'validateDelimiter',
        details: { value, isHash, actualLength: value.length },
      }),
    );
  }

  // Must not contain digits
  if (/\d/.test(value)) {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.CONFIG_DELIMITER_DIGITS,
        message: 'Delimiter cannot contain digits',
        functionName: 'validateDelimiter',
        details: { value, isHash },
      }),
    );
  }

  // Must not contain whitespace
  if (/\s/.test(value)) {
    return Err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.CONFIG_DELIMITER_WHITESPACE,
        message: 'Delimiter cannot contain whitespace',
        functionName: 'validateDelimiter',
        details: { value, isHash },
      }),
    );
  }

  // Must not contain any reserved characters anywhere
  for (const ch of RESERVED_CHARS) {
    if (value.includes(ch)) {
      return Err(
        new RangeLinkError({
          code: RangeLinkErrorCodes.CONFIG_DELIMITER_RESERVED,
          message: `Delimiter cannot contain reserved character '${ch}'`,
          functionName: 'validateDelimiter',
          details: { value, isHash, reservedChar: ch },
        }),
      );
    }
  }

  return Ok(undefined);
}
