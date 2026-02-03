/**
 * Bind Result Types - Discriminated union for all binding operations
 *
 * Follows the same composition pattern as QuickPickTypes.ts with a base interface
 * and outcome discriminator.
 */

import type { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';

// ============================================================================
// Bind Details - Destination-specific success information
// ============================================================================

/** Details returned when successfully binding to a terminal */
export interface TerminalBindDetails {
  readonly terminalName: string;
}

/** Details returned when successfully binding to a text editor */
export interface TextEditorBindDetails {
  readonly fileName: string;
  readonly uri: string;
}

// ============================================================================
// Bind Reasons - Why binding was aborted or failed
// ============================================================================

/**
 * Reasons why a bind operation was intentionally aborted (not a failure).
 * Used with the 'aborted' outcome.
 */
export enum BindAbortReason {
  /** Already bound to the same destination - nothing to do */
  ALREADY_BOUND_TO_SAME = 'ALREADY_BOUND_TO_SAME',
  /** User declined to replace current binding */
  USER_DECLINED_REPLACEMENT = 'USER_DECLINED_REPLACEMENT',
}

/**
 * Reasons why a bind operation failed (actual errors).
 * Used with the 'failed' outcome.
 */
export enum BindFailureReason {
  /** Destination is not available (e.g., AI assistant not installed) */
  DESTINATION_NOT_AVAILABLE = 'DESTINATION_NOT_AVAILABLE',
  /** Cannot bind to binary file */
  EDITOR_BINARY_FILE = 'EDITOR_BINARY_FILE',
  /** Cannot bind to read-only file */
  EDITOR_READ_ONLY = 'EDITOR_READ_ONLY',
}

// ============================================================================
// Bind Result Outcomes - Discriminated union components
// ============================================================================

/** Discriminator for all bind result types */
export type BindResultOutcome = 'bound' | 'no-resource' | 'cancelled' | 'aborted' | 'failed';

/** Base bind result with outcome discriminator. All bind results extend this. */
export interface BaseBindResult {
  readonly outcome: BindResultOutcome;
}

/** Successful binding outcome */
export interface BindSuccessResult<TDetails> extends BaseBindResult {
  readonly outcome: 'bound';
  readonly details: TDetails;
}

/** No resource available (no terminals, no active editor, etc.) */
export interface BindNoResourceResult extends BaseBindResult {
  readonly outcome: 'no-resource';
}

/** User cancelled the binding operation (e.g., dismissed picker) */
export interface BindCancelledResult extends BaseBindResult {
  readonly outcome: 'cancelled';
}

/** Binding was intentionally aborted (not a failure) */
export interface BindAbortedResult extends BaseBindResult {
  readonly outcome: 'aborted';
  readonly reason: BindAbortReason;
}

/** Binding failed with an actual error */
export interface BindFailedResult extends BaseBindResult {
  readonly outcome: 'failed';
  readonly reason: BindFailureReason;
  readonly error?: RangeLinkExtensionError;
}

// ============================================================================
// Composed BindResult Type
// ============================================================================

/** Union of all bind result types */
export type BindResult<TDetails> =
  | BindSuccessResult<TDetails>
  | BindNoResourceResult
  | BindCancelledResult
  | BindAbortedResult
  | BindFailedResult;

// ============================================================================
// Convenience Type Aliases
// ============================================================================

export type TerminalBindResult = BindResult<TerminalBindDetails>;
export type TextEditorBindResult = BindResult<TextEditorBindDetails>;
