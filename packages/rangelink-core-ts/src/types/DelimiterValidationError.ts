/**
 * Validation error codes for delimiter validation.
 * These codes enable future i18n support by decoupling error identification from message formatting.
 */
export enum DelimiterValidationError {
  None = 'VALID',
  Empty = 'ERR_EMPTY',
  ContainsDigits = 'ERR_DIGITS',
  ContainsWhitespace = 'ERR_WHITESPACE',
  ContainsReservedChar = 'ERR_RESERVED',
  HashNotSingleChar = 'ERR_HASH_NOT_SINGLE',
}

