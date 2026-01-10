import type { RangeLinkError } from '../errors';

import { Result } from './Result';

/**
 * Specialized Result type for core library operations.
 *
 * Bakes in RangeLinkError as the error type, reducing verbosity
 * and making function signatures cleaner throughout the core library.
 */
export type CoreResult<T> = Result<T, RangeLinkError>;

/**
 * Companion object for CoreResult type.
 *
 * Enables cleaner syntax: `CoreResult.ok(value)` instead of `Result.ok(value)`.
 */
export const CoreResult = {
  ok: <T>(value: T): CoreResult<T> => Result.ok(value),
  err: <T = never>(error: RangeLinkError): CoreResult<T> => Result.err(error),
};
