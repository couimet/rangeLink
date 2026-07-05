import { DetailedError, type ErrorOptions } from '@couimet/detailed-error';

import type { RangeLinkErrorCodes } from './RangeLinkErrorCodes';

/**
 * Base error class for all RangeLink errors.
 *
 * Extends DetailedError to provide structured error information with:
 * - Typed error codes (RangeLinkErrorCodes enum)
 * - Function name tracking
 * - Contextual details object
 * - Cause chaining
 */
export class RangeLinkError extends DetailedError<RangeLinkErrorCodes> {
  constructor(options: ErrorOptions<RangeLinkErrorCodes>) {
    super(options);
    this.name = 'RangeLinkError';
  }
}
