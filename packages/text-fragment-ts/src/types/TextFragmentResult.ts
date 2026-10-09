import type { TextFragmentError } from '../errors';

import { DetailedResult } from '@couimet/detailed-result';
import type { PercentCodecError } from 'percent-codec-ts';

/**
 * Result of a text fragment operation.
 *
 * The error type is a union because decoding a directive term delegates to
 * percent-codec-ts, and that package's error travels through this package by
 * identity. A caller can still `instanceof PercentCodecError` to tell a codec
 * failure from a structural one, and the `functionName` on the error still names
 * the function that actually threw.
 *
 * `formatTextFragment` never produces a `PercentCodecError` - it only encodes.
 */
export class TextFragmentResult<T> extends DetailedResult<T, TextFragmentError | PercentCodecError> {
  private constructor(success: boolean, value: T | undefined, error: TextFragmentError | PercentCodecError | undefined) {
    super(success, value, error);
  }

  static ok<T>(value: T): TextFragmentResult<T> {
    return new TextFragmentResult<T>(true, value, undefined);
  }

  static err<T = never>(error: TextFragmentError | PercentCodecError): TextFragmentResult<T> {
    return new TextFragmentResult<T>(false, undefined, error);
  }
}
