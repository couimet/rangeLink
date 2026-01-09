import type { RangeLinkError } from '../errors';

import type { Result } from './Result';

/**
 * Specialized Result type for core library operations.
 *
 * Bakes in RangeLinkError as the error type, reducing verbosity
 * and making function signatures cleaner throughout the core library.
 */
export type CoreResult<T> = Result<T, RangeLinkError>;
