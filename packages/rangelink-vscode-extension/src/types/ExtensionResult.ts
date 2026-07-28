import { DetailedResult } from '@couimet/detailed-result';

import type { ExtensionError } from './ExtensionError';

export class ExtensionResult<T> extends DetailedResult<T, ExtensionError> {
  private constructor(success: boolean, value: T | undefined, error: ExtensionError | undefined) {
    super(success, value, error);
  }

  static ok<T>(value: T): ExtensionResult<T> {
    return new ExtensionResult<T>(true, value, undefined);
  }

  static err<T = never>(error: ExtensionError): ExtensionResult<T> {
    return new ExtensionResult<T>(false, undefined, error);
  }
}
