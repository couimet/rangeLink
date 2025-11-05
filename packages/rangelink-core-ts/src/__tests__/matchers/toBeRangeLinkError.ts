import { RangeLinkError } from '../../errors/RangeLinkError';
import type { RangeLinkErrorCodes } from '../../errors/RangeLinkErrorCodes';
import type { ErrorDetails } from '../../errors/detailedError';

/**
 * Expected error properties for strict validation.
 */
export interface ExpectedRangeLinkError {
  /** Expected error code (required) */
  code: RangeLinkErrorCodes;
  /** Expected error message - exact match (required) */
  message: string;
  /** Expected function name (required - all RangeLinkErrors must have this) */
  functionName: string;
  /** Expected error details - uses toStrictEqual (optional) */
  details?: ErrorDetails;
  /** Expected cause error (optional) */
  cause?: Error;
}

/**
 * Custom Jest matcher to validate RangeLinkError objects with strict equality.
 * Enforces that all required properties from DetailedError are present and correct.
 *
 * Validates:
 * - Error is actual instance of RangeLinkError class (not just duck-typed)
 * - Code matches exactly (required)
 * - Message matches exactly (required)
 * - Function name matches exactly (required - all errors must have this)
 * - Details match with toStrictEqual (optional)
 * - Cause matches (optional)
 *
 * @example
 * ```typescript
 * expect(error).toBeRangeLinkError({
 *   code: RangeLinkErrorCodes.SELECTION_EMPTY,
 *   message: 'Selections array must not be empty',
 *   functionName: 'validateInputSelection',
 *   details: { selectionsLength: 0 }
 * });
 * ```
 */
export const toBeRangeLinkError = (
  received: unknown,
  expected: ExpectedRangeLinkError,
): jest.CustomMatcherResult => {
  const failures: string[] = [];

  // CRITICAL: Enforce actual RangeLinkError instance (not duck-typed)
  if (!(received instanceof RangeLinkError)) {
    return {
      pass: false,
      message: () => {
        const receivedType = received?.constructor?.name || typeof received;
        return `Expected value to be an instance of RangeLinkError, but received: ${receivedType}\n  Value: ${JSON.stringify(received)}`;
      },
    };
  }

  const error = received as RangeLinkError;

  // Validate required property: code (exact match)
  if (error.code !== expected.code) {
    failures.push(`  Code: expected "${expected.code}", received "${error.code}"`);
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
    } catch (e) {
      failures.push(
        `  Details (toStrictEqual):\n    expected: ${JSON.stringify(expected.details, null, 2)}\n    received: ${JSON.stringify(error.details, null, 2)}`,
      );
    }
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
  }

  const pass = failures.length === 0;

  return {
    pass,
    message: pass
      ? () =>
          `Expected error not to match RangeLinkError with properties:\n${JSON.stringify(expected, null, 2)}`
      : () => `Expected RangeLinkError to match all properties:\n${failures.join('\n')}`,
  };
};

/**
 * Custom Jest matcher for testing functions that throw RangeLinkError.
 * Follows Jest's standard `.toThrow()` pattern.
 *
 * @example
 * ```typescript
 * expect(() => validateInputSelection(input)).toThrowRangeLinkError({
 *   code: RangeLinkErrorCodes.SELECTION_EMPTY,
 *   message: 'Selections array must not be empty',
 *   functionName: 'validateInputSelection'
 * });
 * ```
 */
export const toThrowRangeLinkError = (
  received: () => void,
  expected: ExpectedRangeLinkError,
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
        `Expected function to throw RangeLinkError with code "${expected.code}", but nothing was thrown`,
    };
  }

  // Use the existing validation logic from toBeRangeLinkError
  return toBeRangeLinkError(caughtError, expected);
};

/**
 * TypeScript declaration for Jest matchers
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeRangeLinkError(expected: ExpectedRangeLinkError): R;
      toThrowRangeLinkError(expected: ExpectedRangeLinkError): R;
    }
  }
}
