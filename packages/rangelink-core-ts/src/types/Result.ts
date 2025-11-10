import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';

/**
 * Functional error handling Value Object.
 * Represents either a successful value or an error.
 *
 * Use factory methods to create instances:
 * - `Result.ok(value)` for success
 * - `Result.err(error)` for failure
 *
 * Access value/error safely via getters after checking `.success`:
 * ```typescript
 * if (result.success) {
 *   console.log(result.value); // Safe
 * } else {
 *   console.log(result.error); // Safe
 * }
 * ```
 */
export class Result<T, E> {
  private readonly _success: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  /**
   * Private constructor - use Result.ok() or Result.err() factory methods.
   *
   * Validates internal invariants to prevent invalid states (defense in depth).
   * @throws {RangeLinkError} if both value and error are defined
   */
  private constructor(success: boolean, value?: T, error?: E) {
    // Validate: success Result cannot have an error
    if (success && error !== undefined) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.RESULT_INVALID_STATE,
        message: 'Result marked as success cannot have an error defined',
        functionName: 'Result.constructor',
        details: { success, hasValue: value !== undefined, hasError: error !== undefined },
      });
    }

    // Validate: error Result cannot have a value
    if (!success && value !== undefined) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.RESULT_INVALID_STATE,
        message: 'Result marked as error cannot have a value defined',
        functionName: 'Result.constructor',
        details: { success, hasValue: value !== undefined, hasError: error !== undefined },
      });
    }

    this._success = success;
    this._value = value;
    this._error = error;
  }

  /**
   * Create a successful Result containing a value.
   */
  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>(true, value, undefined);
  }

  /**
   * Create an error Result containing an error.
   */
  static err<E>(error: E): Result<never, E> {
    return new Result<never, E>(false, undefined, error);
  }

  /**
   * Check if Result is successful.
   * Always check this before accessing .value or .error.
   */
  get success(): boolean {
    return this._success;
  }

  /**
   * Get the success value.
   * @throws {RangeLinkError} if Result is an error (check .success first)
   */
  get value(): T {
    if (!this._success) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.RESULT_VALUE_ACCESS_ON_ERROR,
        message: 'Cannot access value on an error Result. Check .success before accessing .value',
        functionName: 'Result.value',
      });
    }
    return this._value as T;
  }

  /**
   * Get the error.
   * @throws {RangeLinkError} if Result is successful (check .success first)
   */
  get error(): E {
    if (this._success) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.RESULT_ERROR_ACCESS_ON_SUCCESS,
        message: 'Cannot access error on a successful Result. Check .success before accessing .error',
        functionName: 'Result.error',
      });
    }
    return this._error as E;
  }

  /**
   * Serialize Result to JSON maintaining current structure.
   * Useful for logging and API responses.
   */
  toJSON(): { success: true; value: T } | { success: false; error: E } {
    return this._success
      ? { success: true, value: this._value as T }
      : { success: false, error: this._error as E };
  }
}
