import { DetailedError, type ErrorDetails, type ErrorOptions } from 'rangelink-core-ts';

import type { RangeLinkExtensionErrorCodes } from './RangeLinkExtensionErrorCodes';
import { RangeLinkExtensionErrorCodes as ErrorCodes } from './RangeLinkExtensionErrorCodes';

/**
 * Base error class for all rangelink-vscode-extension errors.
 *
 * Extends DetailedError to provide structured error information with:
 * - Typed error codes (RangeLinkExtensionErrorCodes enum)
 * - Function name tracking
 * - Contextual details object
 * - Cause chaining
 *
 * Inherits shared error codes from rangelink-core-ts (VALIDATION, UNKNOWN, UNEXPECTED_CODE_PATH)
 * and adds extension-specific codes (DESTINATION_NOT_IMPLEMENTED, GENERATE_LINK_SELECTION_EMPTY, etc.).
 */
export class RangeLinkExtensionError extends DetailedError<RangeLinkExtensionErrorCodes> {
  constructor(options: ErrorOptions<RangeLinkExtensionErrorCodes>) {
    super(options);
    this.name = 'RangeLinkExtensionError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RangeLinkExtensionError);
    }
  }

  /**
   * Create an UNEXPECTED_CODE_PATH error with uniform `details.unexpectedValue`.
   *
   * Use this for every `default:` block or unexpected-value guard.
   * All call sites share the same details key, making error tooling consistent.
   */
  static forUnexpected(
    label: string,
    value: unknown,
    functionName: string,
    options?: { message?: string; extraDetails?: ErrorDetails },
  ): RangeLinkExtensionError {
    return new RangeLinkExtensionError({
      code: ErrorCodes.UNEXPECTED_CODE_PATH,
      message: options?.message ?? `Unexpected ${label}: ${JSON.stringify(value)}`,
      functionName,
      details: { ...options?.extraDetails, unexpectedValue: value },
    });
  }
}
