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
 * Handle to a focused destination with insert capability.
 *
 * The insert function captures the target (editor/terminal) in its closure,
 * eliminating stale reference issues.
 */
export interface FocusedDestination {
  insert: (text: string) => Promise<boolean>;
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
 * On success, contains a FocusedDestination with insert capability.
 * On failure, contains a typed error with reason.
 */
export type FocusResult = Result<FocusedDestination, FocusError>;

/**
 * Capability for focusing paste destinations and obtaining insert handles.
 *
 * The focus() method returns a Result containing a FocusedDestination
 * whose insert function captures the fresh target reference.
 */
export interface FocusCapability {
  focus(context: LoggingContext): Promise<FocusResult>;
}
