import { Result } from 'rangelink-core-ts';

import type { ExtensionError } from './ExtensionError';

/**
 * Specialized Result type for extension operations.
 *
 * Bakes in ExtensionError (RangeLinkError | RangeLinkExtensionError) as the error type,
 * reducing verbosity and making function signatures cleaner throughout the extension.
 */
export type ExtensionResult<T> = Result<T, ExtensionError>;

/**
 * Companion object for ExtensionResult type.
 *
 * Enables cleaner syntax: `ExtensionResult.ok(value)` instead of `Result.ok(value)`.
 */
export const ExtensionResult = {
  ok: <T>(value: T): ExtensionResult<T> => Result.ok(value),
  err: <T = never>(error: ExtensionError): ExtensionResult<T> => Result.err(error),
};
