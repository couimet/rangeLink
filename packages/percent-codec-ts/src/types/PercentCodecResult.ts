import type { PercentCodecError } from '../errors';

import { DetailedResult } from '@couimet/detailed-result';

/**
 * Result of a percent codec operation, pinned to {@link PercentCodecError}.
 */
export class PercentCodecResult<T> extends DetailedResult<T, PercentCodecError> {
  private constructor(success: boolean, value: T | undefined, error: PercentCodecError | undefined) {
    super(success, value, error);
  }

  static ok<T>(value: T): PercentCodecResult<T> {
    return new PercentCodecResult<T>(true, value, undefined);
  }

  static err<T = never>(error: PercentCodecError): PercentCodecResult<T> {
    return new PercentCodecResult<T>(false, undefined, error);
  }
}
