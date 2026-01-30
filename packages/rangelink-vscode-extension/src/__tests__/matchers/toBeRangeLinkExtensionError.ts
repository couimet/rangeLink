import type { ErrorDetails, Result } from 'rangelink-core-ts';

import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';

/**
 * Expected error properties for strict validation.
 * Note: Error code is passed as a separate string parameter to enforce string literal usage.
 */
export interface ExpectedRangeLinkExtensionError {
  /** Expected error message - exact match (required) */
  message: string;
  /** Expected function name (required - all RangeLinkExtensionErrors must have this) */
  functionName: string;
  /** Expected error details - uses toStrictEqual (optional) */
  details?: ErrorDetails;
  /** Expected cause error (optional) */
  cause?: Error;
}

/**
 * Custom Jest matcher to validate RangeLinkExtensionError objects with strict equality.
 * Enforces that all required properties from DetailedError are present and correct.
 *
 * Validates:
 * - Error is actual instance of RangeLinkExtensionError class (not just duck-typed)
 * - Code matches exactly (required, passed as string literal)
 * - Message matches exactly (required)
 * - Function name matches exactly (required - all errors must have this)
 * - Details match with toStrictEqual (optional)
 * - Cause matches (optional)
 *
 * @param received - The value to test
 * @param expectedCode - Expected error code as string literal (e.g., 'TERMINAL_NOT_DEFINED')
 * @param expected - Expected error properties (message, functionName, details, cause)
 */
export const toBeRangeLinkExtensionError = (
  received: unknown,
  expectedCode: string,
  expected: ExpectedRangeLinkExtensionError,
): jest.CustomMatcherResult => {
  const failures: string[] = [];

  // CRITICAL: Enforce actual RangeLinkExtensionError instance (not duck-typed)
  if (!(received instanceof RangeLinkExtensionError)) {
    return {
      pass: false,
      message: () => {
        const receivedType = received?.constructor?.name || typeof received;
        return `Expected value to be an instance of RangeLinkExtensionError, but received: ${receivedType}\n  Value: ${JSON.stringify(received)}`;
      },
    };
  }

  const error = received as RangeLinkExtensionError;

  // Validate required property: code (exact match with string literal)
  if (error.code !== expectedCode) {
    failures.push(`  Code: expected "${expectedCode}", received "${error.code}"`);
  }

  // Validate required property: message (exact match)
  if (error.message !== expected.message) {
    failures.push(
      `  Message:\n    expected: "${expected.message}"\n    received: "${error.message}"`,
    );
  }

  // Validate required property: functionName (exact match)
  if (error.functionName !== expected.functionName) {
    failures.push(
      `  Function name: expected "${expected.functionName}", received "${error.functionName || 'undefined'}"`,
    );
  }

  // Validate optional property: details (strict equality)
  if (expected.details !== undefined) {
    try {
      expect(error.details).toStrictEqual(expected.details);
    } catch {
      failures.push(
        `  Details (toStrictEqual):\n    expected: ${JSON.stringify(expected.details, null, 2)}\n    received: ${JSON.stringify(error.details, null, 2)}`,
      );
    }
  } else if (error.details !== undefined) {
    failures.push(`  Details: expected undefined, received ${JSON.stringify(error.details)}`);
  }

  // Validate optional property: cause
  if (expected.cause !== undefined) {
    if (error.cause !== expected.cause) {
      const expectedCauseMsg =
        expected.cause instanceof Error ? expected.cause.message : 'undefined';
      const receivedCauseMsg =
        error.cause instanceof Error ? (error.cause as Error).message : 'undefined';
      failures.push(`  Cause: expected ${expectedCauseMsg}, received ${receivedCauseMsg}`);
    }
  } else if (error.cause !== undefined) {
    const causeMsg =
      error.cause instanceof Error ? (error.cause as Error).message : String(error.cause);
    failures.push(`  Cause: expected undefined, received error with message "${causeMsg}"`);
  }

  const pass = failures.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? `Expected error NOT to match RangeLinkExtensionError("${expectedCode}")`
        : `Expected RangeLinkExtensionError("${expectedCode}") to match:\n${failures.join('\n')}`,
  };
};

/**
 * Custom Jest matcher for testing synchronous functions that throw RangeLinkExtensionError.
 * Follows Jest's standard `.toThrow()` pattern.
 *
 * @param received - Synchronous function to execute that should throw
 * @param expectedCode - Expected error code as string literal (e.g., 'TERMINAL_NOT_DEFINED')
 * @param expected - Expected error properties (message, functionName, details, cause)
 */
export const toThrowRangeLinkExtensionError = (
  received: () => void,
  expectedCode: string,
  expected: ExpectedRangeLinkExtensionError,
): jest.CustomMatcherResult => {
  let caughtError: unknown;

  // Execute the function and catch any error
  try {
    received();
  } catch (error) {
    caughtError = error;
  }

  // If nothing was thrown
  if (caughtError === undefined) {
    return {
      pass: false,
      message: () =>
        `Expected function to throw RangeLinkExtensionError with code "${expectedCode}", but nothing was thrown`,
    };
  }

  // Use the existing validation logic from toBeRangeLinkExtensionError
  return toBeRangeLinkExtensionError(caughtError, expectedCode, expected);
};

/**
 * Custom Jest matcher for testing asynchronous functions that throw RangeLinkExtensionError.
 * Async version of toThrowRangeLinkExtensionError.
 *
 * @param received - Async function to execute that should throw
 * @param expectedCode - Expected error code as string literal (e.g., 'TERMINAL_NOT_DEFINED')
 * @param expected - Expected error properties (message, functionName, details, cause)
 */
export const toThrowRangeLinkExtensionErrorAsync = async (
  received: () => Promise<void>,
  expectedCode: string,
  expected: ExpectedRangeLinkExtensionError,
): Promise<jest.CustomMatcherResult> => {
  let caughtError: unknown;

  // Execute the async function and catch any error
  try {
    await received();
  } catch (error) {
    caughtError = error;
  }

  // If nothing was thrown
  if (caughtError === undefined) {
    return {
      pass: false,
      message: () =>
        `Expected async function to throw RangeLinkExtensionError with code "${expectedCode}", but nothing was thrown`,
    };
  }

  // Use the existing validation logic from toBeRangeLinkExtensionError
  return toBeRangeLinkExtensionError(caughtError, expectedCode, expected);
};

/**
 * Custom Jest matcher for Result<T, RangeLinkExtensionError> types.
 * Combines toBeErrWith and toBeRangeLinkExtensionError into a single assertion for cleaner tests.
 *
 * @param received - The Result to test
 * @param expectedCode - Expected error code as string literal (e.g., 'BOOKMARK_NOT_FOUND')
 * @param expected - Expected error properties (message, functionName, details, cause)
 */
export const toBeRangeLinkExtensionErrorErr = (
  received: Result<unknown, unknown>,
  expectedCode: string,
  expected: ExpectedRangeLinkExtensionError,
): jest.CustomMatcherResult => {
  // First check if it's an error Result
  if (received.success) {
    return {
      pass: false,
      message: () =>
        `Expected result to be an error, but it succeeded with value: ${JSON.stringify(received.value)}`,
    };
  }

  // Then validate it's a RangeLinkExtensionError with correct properties
  return toBeRangeLinkExtensionError(received.error, expectedCode, expected);
};
