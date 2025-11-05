import type { RangeLinkError } from '../../errors/RangeLinkError';
import type { RangeLinkErrorCodes } from '../../errors/RangeLinkErrorCodes';
import type { ErrorDetails } from '../../errors/detailedError';

/**
 * Expected error properties for strict validation
 */
export interface ExpectedRangeLinkError {
  /** Expected error code */
  code: RangeLinkErrorCodes;
  /** Expected error message (exact match) */
  message: string;
  /** Expected function name (optional) */
  functionName?: string;
  /** Expected error details (optional, uses strict equality) */
  details?: ErrorDetails;
}

/**
 * Custom Jest matcher to validate RangeLinkError objects with strict equality.
 *
 * Validates:
 * - Error is instance of RangeLinkError
 * - Code matches exactly
 * - Message matches exactly
 * - Function name matches (if provided)
 * - Details match with strict equality (if provided)
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
export function toBeRangeLinkError(
  received: unknown,
  expected: ExpectedRangeLinkError,
): jest.CustomMatcherResult {
  // Type guard check
  if (!(received && typeof received === 'object' && 'code' in received && 'message' in received)) {
    return {
      pass: false,
      message: () =>
        `Expected value to be a RangeLinkError, but received: ${JSON.stringify(received)}`,
    };
  }

  const error = received as RangeLinkError;
  const failures: string[] = [];

  // Check error code (exact match)
  if (error.code !== expected.code) {
    failures.push(`  Code: expected ${expected.code}, received ${error.code}`);
  }

  // Check message (exact match)
  if (error.message !== expected.message) {
    failures.push(
      `  Message: expected "${expected.message}", received "${error.message}"`,
    );
  }

  // Check function name if provided
  if (expected.functionName !== undefined) {
    if (error.functionName !== expected.functionName) {
      failures.push(
        `  Function name: expected "${expected.functionName}", received "${error.functionName}"`,
      );
    }
  }

  // Check details if provided (strict equality)
  if (expected.details !== undefined) {
    try {
      expect(error.details).toStrictEqual(expected.details);
    } catch (e) {
      failures.push(
        `  Details: expected ${JSON.stringify(expected.details, null, 2)}, received ${JSON.stringify(error.details, null, 2)}`,
      );
    }
  }

  const pass = failures.length === 0;

  return {
    pass,
    message: pass
      ? () => `Expected error not to match RangeLinkError, but it did`
      : () => `Expected RangeLinkError to match:\n${failures.join('\n')}`,
  };
}

/**
 * TypeScript declaration for Jest matcher
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeRangeLinkError(expected: ExpectedRangeLinkError): R;
    }
  }
}
