import type { LoggingContext } from 'barebone-logger';
import type { Result } from 'rangelink-core-ts';

/**
 * Reasons why focusing a paste destination can fail.
 */
export const FocusErrorReason = {
  COMMAND_FOCUS_FAILED: 'COMMAND_FOCUS_FAILED',
  EDITOR_AMBIGUOUS_COLUMNS: 'EDITOR_AMBIGUOUS_COLUMNS',
  EDITOR_NOT_VISIBLE: 'EDITOR_NOT_VISIBLE',
  EDITOR_VIEWCOLUMN_UNDEFINED: 'EDITOR_VIEWCOLUMN_UNDEFINED',
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

/**
 * Result of focusing a paste destination.
 * On success, contains a FocusedDestination with inserter capability.
 * On failure, contains a typed error with reason.
 */
export type FocusResult = Result<FocusedDestination, FocusError>;

/**
 * Capability for focusing paste destinations and obtaining inserter handles.
 *
 * The focus() method returns a Result containing a FocusedDestination
 * whose inserter function captures the fresh target reference.
 */
export interface FocusCapability {
  focus(context: LoggingContext): Promise<FocusResult>;
}
