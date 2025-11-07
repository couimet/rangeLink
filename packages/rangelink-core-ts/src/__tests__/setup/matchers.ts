import { Result } from '../../types/Result';
import {
  toBeRangeLinkError,
  toBeRangeLinkErrorErr,
  toThrowRangeLinkError,
  type ExpectedRangeLinkError,
} from '../matchers/toBeRangeLinkError';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOk(): R;
      toBeOkWith<T>(assertValue: (value: T) => void): R;
      toBeErr(): R;
      toBeErrWith<E>(assertError: (error: E) => void): R;
      toBeRangeLinkError(code: string, expected: ExpectedRangeLinkError): R;
      toBeRangeLinkErrorErr(code: string, expected: ExpectedRangeLinkError): R;
      toThrowRangeLinkError(code: string, expected: ExpectedRangeLinkError): R;
    }
  }
}

expect.extend({
  toBeRangeLinkError,
  toBeRangeLinkErrorErr,
  toThrowRangeLinkError,

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
