import { DetailedError, ErrorOptions } from './detailedError';
import type { RangeLinkErrorCodes } from './RangeLinkErrorCodes';

/**
 * Base error class for all RangeLink errors.
 *
 * Extends DetailedError to provide structured error information with:
 * - Typed error codes (RangeLinkErrorCodes enum)
 * - Function name tracking
 * - Contextual details object
 * - Cause chaining
 *
 * @example
 * ```typescript
 * throw new RangeLinkError({
 *   code: RangeLinkErrorCodes.SELECTION_ERR_EMPTY,
 *   message: 'Selections array must not be empty',
 *   functionName: 'validateInputSelection',
 *   details: { selectionsLength: 0, selectionType: 'Normal' }
 * });
 * ```
 */
export class RangeLinkError extends DetailedError<RangeLinkErrorCodes> {
  constructor(options: ErrorOptions<RangeLinkErrorCodes>) {
    super(options);
    this.name = 'RangeLinkError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RangeLinkError);
    }
  }
}
