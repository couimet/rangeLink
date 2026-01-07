import type { LoggingContext } from 'barebone-logger';
import type { Result } from 'rangelink-core-ts';

/**
 * Reasons why focusing a paste destination can fail.
 */
export const FocusErrorReason = {
  SHOW_DOCUMENT_FAILED: 'SHOW_DOCUMENT_FAILED',
  TERMINAL_FOCUS_FAILED: 'TERMINAL_FOCUS_FAILED',
  COMMAND_FOCUS_FAILED: 'COMMAND_FOCUS_FAILED',
} as const;

export type FocusErrorReason = (typeof FocusErrorReason)[keyof typeof FocusErrorReason];

/**
 * Successful focus result containing the insert capability.
 * The insert function captures the fresh editor/terminal in its closure.
 */
export interface FocusSuccess {
  insert: (text: string, context: LoggingContext) => Promise<boolean>;
}

/**
 * Focus failure with typed reason and optional cause.
 */
export interface FocusError {
  reason: FocusErrorReason;
  cause?: unknown;
}

/**
 * Result of focusing a paste destination.
 * On success, contains an insert function that captures the fresh target.
 * On failure, contains a typed error with reason.
 */
export type FocusResult = Result<FocusSuccess, FocusError>;

/**
 * Unified capability for paste destinations that handles both focus and insert.
 *
 * The focus() method returns a Result containing an insert closure that captures
 * the fresh editor/terminal reference, eliminating stale reference issues.
 */
export interface PasteExecutor {
  focus(context: LoggingContext): Promise<FocusResult>;
}
