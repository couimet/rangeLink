import { DetailedResult } from '@couimet/detailed-result';
import type { LoggingContext } from '@couimet/logger-contract';

/**
 * Reasons why focusing a paste destination can fail.
 */
export const FocusErrorReason = {
  COMMAND_FOCUS_FAILED: 'COMMAND_FOCUS_FAILED',
  EDITOR_AMBIGUOUS_COLUMNS: 'EDITOR_AMBIGUOUS_COLUMNS',
  EDITOR_NOT_VISIBLE: 'EDITOR_NOT_VISIBLE',
  SHOW_DOCUMENT_FAILED: 'SHOW_DOCUMENT_FAILED',
  TERMINAL_FOCUS_FAILED: 'TERMINAL_FOCUS_FAILED',
  // Use alphabetical order to make it easier to maintain
} as const;

export type FocusErrorReason = (typeof FocusErrorReason)[keyof typeof FocusErrorReason];

/**
 * Handle to a focused destination with inserter capability.
 *
 * The inserter function captures the target (editor/terminal) in its closure,
 * eliminating stale reference issues.
 */
export interface FocusedDestination {
  inserter: (text: string) => Promise<boolean>;
}

/**
 * Focus failure with typed reason and optional cause.
 */
export interface FocusError {
  reason: FocusErrorReason;
  cause?: unknown;
}

export class FocusResult extends DetailedResult<FocusedDestination, FocusError> {
  private constructor(
    success: boolean,
    value: FocusedDestination | undefined,
    error: FocusError | undefined,
  ) {
    super(success, value, error);
  }

  static ok(value: FocusedDestination): FocusResult {
    return new FocusResult(true, value, undefined);
  }

  static err(error: FocusError): FocusResult {
    return new FocusResult(false, undefined, error);
  }
}

/**
 * Capability for focusing paste destinations and obtaining inserter handles.
 *
 * The focus() method returns a Result containing a FocusedDestination
 * whose inserter function captures the fresh target reference.
 */
export interface FocusCapability {
  focus(context: LoggingContext): Promise<FocusResult>;
}
