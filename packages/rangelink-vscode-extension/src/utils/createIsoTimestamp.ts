/**
 * Creates an ISO 8601 timestamp string for the current moment.
 * Suitable for serialization and persistence.
 */
export const createIsoTimestamp = (): string => new Date().toISOString();
