import { toBeDetailedError as _toBeDetailedError } from '@couimet/detailed-error-testing';
import type { ExpectedDetailedError } from '@couimet/detailed-error-testing';
import '@couimet/detailed-error-testing/setup-before-jest-30';

import { Result } from '../../types/Result';

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
  toBeOk(received: Result<unknown, unknown>) {
    const pass = received.success === true;
    return {
      pass,
      message: () =>
        pass
          ? `Expected result to be an error, but it succeeded with value: ${JSON.stringify(received.value)}`
          : `Expected result to be successful, but it failed with error: ${received.error}`,
    };
  },

  toBeOkWith<T>(received: Result<T, unknown>, assertValue: (value: T) => void) {
    if (!received.success) {
      return {
        pass: false,
        message: () =>
          `Expected result to be successful, but it failed with error: ${received.error}`,
      };
    }

    try {
      assertValue(received.value);
      return {
        pass: true,
        message: () => 'Result is successful and value assertions passed',
      };
    } catch (error) {
      return {
        pass: false,
        message: () =>
          `Result is successful but value assertions failed:\n${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  toBeErr(received: Result<unknown, unknown>) {
    const pass = received.success === false;
    return {
      pass,
      message: () =>
        pass
          ? `Expected result to be successful, but it failed with error: ${received.error}`
          : `Expected result to be an error, but it succeeded with value: ${JSON.stringify(received.value)}`,
    };
  },

  toBeErrWith<E>(received: Result<unknown, E>, assertError: (error: E) => void) {
    if (received.success) {
      return {
        pass: false,
        message: () =>
          `Expected result to be an error, but it succeeded with value: ${JSON.stringify(received.value)}`,
      };
    }

    try {
      assertError(received.error);
      return {
        pass: true,
        message: () => 'Result is an error and error assertions passed',
      };
    } catch (error) {
      return {
        pass: false,
        message: () =>
          `Result is an error but error assertions failed:\n${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export {};
