// New detailed error infrastructure
export { DetailedError, type ErrorOptions, type ErrorDetails } from './detailedError';
export { RangeLinkError } from './RangeLinkError';
export { RangeLinkErrorCodes, RangeLinkSpecificCodes } from './RangeLinkErrorCodes';
export { SharedErrorCodes } from './sharedErrorCodes';

// Legacy exports (kept temporarily for backward compatibility during migration)
export { SelectionValidationError } from './SelectionValidationError';
