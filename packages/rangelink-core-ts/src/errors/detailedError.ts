/** Base type for error details */
export type ErrorDetails = { [key: string]: unknown };

/** Base type for error options */
export type ErrorOptions<T extends string> = {
  /** Unique error code identifying the type of error */
  readonly code: T;
  /** Human-readable error message */
  readonly message: string;
  /** Name of the function where the error occurred */
  readonly functionName?: string;
  /** Additional contextual information about the error */
  readonly details?: ErrorDetails;
  /** Original error that caused this error */
  readonly cause?: unknown;
};

/**
 * Base class for all errors.
 *
 * Using a generic type for `code` allows us to use an enum to strongly type the error codes.
 *
 * This class focuses on pure error handling: organizing the error-related data in a documented and predictable way.
 */
export abstract class DetailedError<T extends string> extends Error {
  /** Unique error code identifying the type of error */
  public readonly code: T;
  /** Name of the function where the error occurred */
  public readonly functionName?: string;
  /** Additional contextual information about the error */
  public readonly details?: ErrorDetails;
  /** Original error that caused this error */
  public readonly cause?: unknown;

  constructor(errorOptions: ErrorOptions<T>) {
    const { code, details, cause, message, functionName } = errorOptions;

    super(message);

    this.code = code;
    this.functionName = functionName;
    this.details = details;
    this.cause = cause;
  }
}
