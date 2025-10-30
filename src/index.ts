/**
 * RangeLink - Public API
 *
 * This module exports the public API for the RangeLink library.
 * Use this for importing types and utilities when consuming RangeLink.
 */

// Re-export main service class
export { RangeLinkService } from './extension';

// Re-export public types and interfaces
export type { Link } from './extension';

// Re-export public enums
export { PathFormat, DelimiterValidationError } from './extension';

// Note: The following are internal/testing exports and should not be
// part of the public API in a production library:
// - getErrorCodeForTesting
// - RangeLinkMessageCode
// - LogLevel
//
// When moving to a monorepo structure (rangelink-core-ts), these should
// be removed or placed in a separate testing utilities module.
