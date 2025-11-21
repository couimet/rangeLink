import type { Result } from 'rangelink-core-ts';

import {
  toBeRangeLinkError,
  toBeRangeLinkErrorErr,
  toThrowRangeLinkError,
  type ExpectedRangeLinkError,
} from '../matchers/toBeRangeLinkError';
import {
  toBeRangeLinkExtensionError,
  toThrowRangeLinkExtensionError,
  toThrowRangeLinkExtensionErrorAsync,
  type ExpectedRangeLinkExtensionError,
} from '../matchers/toBeRangeLinkExtensionError';
import { toBeErr, toBeErrWith, toBeOk, toBeOkWith } from '../matchers/toBeResult';

declare global {
  namespace jest {
    interface Matchers<R> {
      // Result matchers
      toBeOk(): R;
      toBeOkWith<T>(assertValue: (value: T) => void): R;
      toBeErr(): R;
      toBeErrWith<E>(assertError: (error: E) => void): R;
      // RangeLinkError matchers
      toBeRangeLinkError(code: string, expected: ExpectedRangeLinkError): R;
      toBeRangeLinkErrorErr(code: string, expected: ExpectedRangeLinkError): R;
      toThrowRangeLinkError(code: string, expected: ExpectedRangeLinkError): R;
      // RangeLinkExtensionError matchers
      toBeRangeLinkExtensionError(code: string, expected: ExpectedRangeLinkExtensionError): R;
      toThrowRangeLinkExtensionError(code: string, expected: ExpectedRangeLinkExtensionError): R;
      toThrowRangeLinkExtensionErrorAsync(
        code: string,
        expected: ExpectedRangeLinkExtensionError,
      ): Promise<R>;
    }
  }
}

expect.extend({
  // Result matchers
  toBeOk,
  toBeOkWith,
  toBeErr,
  toBeErrWith,
  // RangeLinkError matchers
  toBeRangeLinkError,
  toBeRangeLinkErrorErr,
  toThrowRangeLinkError,
  // RangeLinkExtensionError matchers
  toBeRangeLinkExtensionError,
  toThrowRangeLinkExtensionError,
  toThrowRangeLinkExtensionErrorAsync,
});

export {};
