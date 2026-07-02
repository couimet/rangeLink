import '@couimet/detailed-error-testing/setup-before-jest-30';

import type { ExpectedDetailedError } from '@couimet/detailed-error-testing';
import { toBeDetailedError as _toBeDetailedError } from '@couimet/detailed-error-testing';
import { Result } from 'rangelink-core-ts';

import { toBeErr, toBeErrWith, toBeOk, toBeOkWith } from '../matchers/toBeResult';

const isResult = (value: unknown): value is Result<unknown, unknown> => value instanceof Result;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Jest matcher type augmentation requires namespace
  namespace jest {
    interface Matchers<R> {
      toBeOk(): R;
      toBeOkWith<T>(assertValue: (value: T) => void): R;
      toBeErr(): R;
      toBeErrWith<E>(assertError: (error: E) => void): R;
      toBeDetailedError(expectedCode: string, expected: ExpectedDetailedError): R;
    }
  }
}

expect.extend({
  // Result-aware toBeDetailedError — unwraps Result before delegating to the package matcher
  toBeDetailedError(
    received: unknown,
    expectedCode: string,
    expected: ExpectedDetailedError,
  ): jest.CustomMatcherResult {
    if (isResult(received)) {
      if (received.success) {
        return {
          pass: false,
          message: () =>
            `Expected result to be an error, but it succeeded with value: ${JSON.stringify(received.value)}`,
        };
      }
      return _toBeDetailedError(received.error, expectedCode, expected);
    }
    return _toBeDetailedError(received, expectedCode, expected);
  },

  // Result matchers (project-specific, not in @couimet/detailed-error-testing)
  toBeOk,
  toBeOkWith,
  toBeErr,
  toBeErrWith,
});
