import {
  toBeRangeLinkExtensionError,
  toThrowRangeLinkExtensionError,
  toThrowRangeLinkExtensionErrorAsync,
  type ExpectedRangeLinkExtensionError,
} from '../matchers/toBeRangeLinkExtensionError';

declare global {
  namespace jest {
    interface Matchers<R> {
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
  toBeRangeLinkExtensionError,
  toThrowRangeLinkExtensionError,
  toThrowRangeLinkExtensionErrorAsync,
});

export {};
