// Re-export base error infrastructure from rangelink-core-ts
export { DetailedError, type ErrorOptions, type ErrorDetails } from 'rangelink-core-ts';
export { SharedErrorCodes } from 'rangelink-core-ts';

// Extension-specific error infrastructure
export { RangeLinkExtensionError } from './RangeLinkExtensionError';
export {
  RangeLinkExtensionErrorCodes,
  RangeLinkExtensionSpecificCodes,
} from './RangeLinkExtensionErrorCodes';
