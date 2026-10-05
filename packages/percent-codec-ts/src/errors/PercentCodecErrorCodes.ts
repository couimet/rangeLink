import { SharedErrorCodes } from '@couimet/detailed-error';

/**
 * Percent codec error codes.
 *
 * Values are descriptive strings (same as keys) so a code read in a log needs no
 * lookup. Keep alphabetical order within each category.
 */
export enum PercentCodecSpecificCodes {
  //
  // Percent decoding errors
  //
  PERCENT_DECODE_INVALID_UTF8 = 'PERCENT_DECODE_INVALID_UTF8',
  PERCENT_DECODE_MALFORMED = 'PERCENT_DECODE_MALFORMED',
}

/**
 * Union type of all percent codec error codes.
 * Combines package-specific codes with shared error codes.
 */
export type PercentCodecErrorCodes = PercentCodecSpecificCodes | SharedErrorCodes;

/**
 * Merged error codes object.
 * Spread SharedErrorCodes LAST to avoid override issues.
 */
export const PercentCodecErrorCodes = {
  ...PercentCodecSpecificCodes,
  ...SharedErrorCodes,
};
