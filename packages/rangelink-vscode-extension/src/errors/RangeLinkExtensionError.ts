import { DetailedError, ErrorOptions } from 'rangelink-core-ts';

import type { RangeLinkExtensionErrorCodes } from './RangeLinkExtensionErrorCodes';

/**
 * Base error class for all rangelink-vscode-extension errors.
 *
 * Extends DetailedError to provide structured error information with:
 * - Typed error codes (RangeLinkExtensionErrorCodes enum)
 * - Function name tracking
 * - Contextual details object
 * - Cause chaining
 *
 * Inherits shared error codes from rangelink-core-ts (VALIDATION, UNKNOWN, UNEXPECTED_CODE_PATH)
 * and adds extension-specific codes (DESTINATION_NOT_IMPLEMENTED, EMPTY_SELECTION, etc.).
 */
export class RangeLinkExtensionError extends DetailedError<RangeLinkExtensionErrorCodes> {
  constructor(options: ErrorOptions<RangeLinkExtensionErrorCodes>) {
    super(options);
    this.name = 'RangeLinkExtensionError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RangeLinkExtensionError);
    }
  }
}
