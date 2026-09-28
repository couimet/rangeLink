import { SharedErrorCodes } from '@couimet/detailed-error';

/**
 * Text fragment error codes.
 *
 * Values are descriptive strings (same as keys) so a code read in a log needs no
 * lookup. Keep alphabetical order within each category.
 */
export enum TextFragmentSpecificCodes {
  //
  // Link parsing errors
  // Duplicated from rangelink-core-ts's RangeLinkErrorCodes with identical string
  // values, so a rename on one side cannot leave both suites green. Each has its
  // counterpart there; rename both or neither.
  //
  PARSE_EMPTY_LINK = 'PARSE_EMPTY_LINK',
  PARSE_EMPTY_PATH = 'PARSE_EMPTY_PATH',
  PARSE_LINK_TOO_LONG = 'PARSE_LINK_TOO_LONG',
  PARSE_URL_NOT_SUPPORTED = 'PARSE_URL_NOT_SUPPORTED',

  //
  // Text fragment parsing errors
  //
  PARSE_TEXT_FRAGMENT_BAD_STRUCTURE = 'PARSE_TEXT_FRAGMENT_BAD_STRUCTURE',
  PARSE_TEXT_FRAGMENT_EMPTY_TERM = 'PARSE_TEXT_FRAGMENT_EMPTY_TERM',
  PARSE_TEXT_FRAGMENT_EMPTY_VALUE = 'PARSE_TEXT_FRAGMENT_EMPTY_VALUE',
  PARSE_TEXT_FRAGMENT_NO_SEPARATOR = 'PARSE_TEXT_FRAGMENT_NO_SEPARATOR',
}

/**
 * Union type of all text fragment error codes.
 * Combines package-specific codes with shared error codes.
 */
export type TextFragmentErrorCodes = TextFragmentSpecificCodes | SharedErrorCodes;

/**
 * Merged error codes object.
 * Spread SharedErrorCodes LAST to avoid override issues.
 */
export const TextFragmentErrorCodes = {
  ...TextFragmentSpecificCodes,
  ...SharedErrorCodes,
};
