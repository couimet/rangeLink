import {
  toBeRangeLinkExtensionError,
  toThrowRangeLinkExtensionError,
  type ExpectedRangeLinkExtensionError,
} from '../matchers/toBeRangeLinkExtensionError';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeRangeLinkExtensionError(
        code: string,
        expected: ExpectedRangeLinkExtensionError,
      ): R;
      toThrowRangeLinkExtensionError(
        code: string,
        expected: ExpectedRangeLinkExtensionError,
      ): R;
    }
  }
}

expect.extend({
  toBeRangeLinkExtensionError,
  toThrowRangeLinkExtensionError,
});

export {};
