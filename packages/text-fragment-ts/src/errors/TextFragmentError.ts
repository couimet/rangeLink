import type { TextFragmentErrorCodes } from './TextFragmentErrorCodes';

import { DetailedError, type ErrorOptions } from '@couimet/detailed-error';

/**
 * Error thrown by this package's parsing and formatting paths.
 *
 * Extends DetailedError directly rather than any consumer's error class, so this
 * package depends on nothing above it. The assertion matchers compare errors
 * structurally, so a consumer that catches this keeps full detail without this
 * package knowing the consumer exists.
 */
export class TextFragmentError extends DetailedError<TextFragmentErrorCodes> {
  constructor(options: ErrorOptions<TextFragmentErrorCodes>) {
    super(options);
    this.name = 'TextFragmentError';
  }
}
