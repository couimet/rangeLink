import type { RangeLinkExtensionErrorCodes } from './RangeLinkExtensionErrorCodes';

import { DetailedError, type ErrorOptions } from '@couimet/detailed-error';

/**
 * Base error class for all rangelink-vscode-extension errors.
 *
 * Extends DetailedError to provide structured error information with:
 * - Typed error codes (RangeLinkExtensionErrorCodes enum)
 * - Function name tracking
 * - Contextual details object
 * - Cause chaining
 *
 * Includes the core RangeLinkErrorCodes from rangelink-core-ts (which merge RangeLinkSpecificCodes
 * with SharedErrorCodes from @couimet/detailed-error) and adds extension-specific codes
 * (DESTINATION_NOT_IMPLEMENTED, GENERATE_LINK_SELECTION_EMPTY, etc.).
 */
export class RangeLinkExtensionError extends DetailedError<RangeLinkExtensionErrorCodes> {
  constructor(options: ErrorOptions<RangeLinkExtensionErrorCodes>) {
    super(options);
    this.name = 'RangeLinkExtensionError';
  }
}
