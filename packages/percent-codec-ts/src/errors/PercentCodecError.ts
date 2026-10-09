import type { PercentCodecErrorCodes } from './PercentCodecErrorCodes';

import { DetailedError, type ErrorOptions } from '@couimet/detailed-error';

/**
 * Error thrown by the percent codec's decode path.
 *
 * Extends DetailedError directly rather than any consumer's error class, so this
 * package depends on nothing above it. The assertion matchers compare errors
 * structurally, so a consumer that catches this keeps full detail without the
 * codec knowing the consumer exists.
 */
export class PercentCodecError extends DetailedError<PercentCodecErrorCodes> {
  constructor(options: ErrorOptions<PercentCodecErrorCodes>) {
    super(options);
    this.name = 'PercentCodecError';
  }
}
