import type { Result } from 'rangelink-core-ts';

import type { RangeLinkExtensionError } from '../errors';

/**
 * Specialized Result type for extension operations.
 *
 * Bakes in RangeLinkExtensionError as the error type, reducing verbosity
 * and making function signatures cleaner throughout the extension.
 */
export type ExtensionResult<T> = Result<T, RangeLinkExtensionError>;
