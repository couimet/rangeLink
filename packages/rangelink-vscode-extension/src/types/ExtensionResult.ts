import { Result } from 'rangelink-core-ts';

import type { RangeLinkExtensionError } from '../errors';

/**
 * Specialized Result type for extension operations.
 *
 * Bakes in RangeLinkExtensionError as the error type, reducing verbosity
 * and making function signatures cleaner throughout the extension.
 */
export type ExtensionResult<T> = Result<T, RangeLinkExtensionError>;

/**
 * Companion object for ExtensionResult type.
 *
 * Enables cleaner syntax: `ExtensionResult.ok(value)` instead of `Result.ok(value)`.
 */
export const ExtensionResult = {
  ok: <T>(value: T): ExtensionResult<T> => Result.ok(value),
  err: <T = never>(error: RangeLinkExtensionError): ExtensionResult<T> => Result.err(error),
};
