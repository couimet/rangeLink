import { DetailedResult } from '@couimet/detailed-result';

import type { RangeLinkError } from '../errors';

export class CoreResult<T> extends DetailedResult<T, RangeLinkError> {
  private constructor(success: boolean, value: T | undefined, error: RangeLinkError | undefined) {
    super(success, value, error);
  }

  static ok<T>(value: T): CoreResult<T> {
    return new CoreResult<T>(true, value, undefined);
  }

  static err<T = never>(error: RangeLinkError): CoreResult<T> {
    return new CoreResult<T>(false, undefined, error);
  }
}
