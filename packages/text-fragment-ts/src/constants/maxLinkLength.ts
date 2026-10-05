/**
 * Maximum allowed length for a link string during parsing and formatting.
 *
 * Duplicated from rangelink-core-ts's constants/MAX_LINK_LENGTH.ts so this package
 * depends on nothing above it. Same value, same rationale: a safety net against
 * parsing or building extremely long strings. Keep the two in sync.
 */
export const MAX_LINK_LENGTH = 3000;
