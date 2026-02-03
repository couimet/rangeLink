import { SharedErrorCodes } from 'rangelink-core-ts';

/**
 * Extension-specific error codes for rangelink-vscode-extension.
 *
 * Architecture principles (inherited from rangelink-core-ts):
 * - No ERR_ prefix: If defined here, it's an error
 * - Values are descriptive strings (same as keys) for clear context in logs
 * - Categorized with comments for maintainability
 * - Alphabetical order within each category
 *
 * Please keep alphabetical order within each category for ease of maintenance.
 */
export enum RangeLinkExtensionSpecificCodes {
  //
  // Keep alphabetical order
  //
  BOOKMARK_ID_GENERATION_FAILED = 'BOOKMARK_ID_GENERATION_FAILED',
  BOOKMARK_NOT_FOUND = 'BOOKMARK_NOT_FOUND',
  BOOKMARK_SAVE_FAILED = 'BOOKMARK_SAVE_FAILED',
  BOOKMARK_STORE_NOT_AVAILABLE = 'BOOKMARK_STORE_NOT_AVAILABLE',
  DESTINATION_NOT_AVAILABLE = 'DESTINATION_NOT_AVAILABLE',
  DESTINATION_NOT_IMPLEMENTED = 'DESTINATION_NOT_IMPLEMENTED',
  EMPTY_SELECTION = 'EMPTY_SELECTION',
  GENERATE_LINK_FORMAT_FAILED = 'GENERATE_LINK_FORMAT_FAILED',
  GENERATE_LINK_NO_SELECTION = 'GENERATE_LINK_NO_SELECTION',
  GENERATE_LINK_SELECTION_CONVERSION_FAILED = 'GENERATE_LINK_SELECTION_CONVERSION_FAILED',
  GENERATE_LINK_SELECTION_EMPTY = 'GENERATE_LINK_SELECTION_EMPTY',
  MISSING_MESSAGE_CODE = 'MISSING_MESSAGE_CODE',
  SELECTION_CONVERSION_FAILED = 'SELECTION_CONVERSION_FAILED',
  TERMINAL_ITEM_MISSING_REFERENCE = 'TERMINAL_ITEM_MISSING_REFERENCE',
  TERMINAL_NOT_DEFINED = 'TERMINAL_NOT_DEFINED',
  UNEXPECTED_DESTINATION_TYPE = 'UNEXPECTED_DESTINATION_TYPE',
  UNEXPECTED_ITEM_KIND = 'UNEXPECTED_ITEM_KIND',
  UNKNOWN_FOCUS_TYPE = 'UNKNOWN_FOCUS_TYPE',
  //
  // Keep alphabetical order
  //
}

/**
 * Union type of all extension error codes.
 * Combines extension-specific codes with shared error codes.
 */
export type RangeLinkExtensionErrorCodes = RangeLinkExtensionSpecificCodes | SharedErrorCodes;

/**
 * Merged error codes object.
 * Spread SharedErrorCodes LAST to avoid override issues (see sharedErrorCodes.ts docs).
 */
export const RangeLinkExtensionErrorCodes = {
  ...RangeLinkExtensionSpecificCodes,
  ...SharedErrorCodes,
};
