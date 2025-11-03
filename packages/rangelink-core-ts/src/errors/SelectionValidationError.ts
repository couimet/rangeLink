import { RangeLinkMessageCode } from '../types/RangeLinkMessageCode';

/**
 * Selection validation error - thrown by internal validation functions.
 * Public APIs catch this and convert to Result<T, RangeLinkMessageCode>.
 *
 * This hybrid approach provides:
 * - Natural exception flow for internal validation logic
 * - Result-based API for consumers (no throws across boundaries)
 */
export class SelectionValidationError extends Error {
  readonly code: RangeLinkMessageCode;

  constructor(code: RangeLinkMessageCode, message: string) {
    super(`[ERROR] [${code}] ${message}`);
    this.name = 'SelectionValidationError';
    this.code = code;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SelectionValidationError);
    }
  }
}
