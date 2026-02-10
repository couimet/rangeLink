/**
 * Reasons why a bind operation failed.
 *
 * Used as structured error details in ExtensionResult when binding to a destination fails.
 */
export enum BindFailureReason {
  /** Already bound to the same destination */
  ALREADY_BOUND_TO_SAME = 'ALREADY_BOUND_TO_SAME',
  /** Destination is not available (e.g., AI assistant not installed) */
  DESTINATION_NOT_AVAILABLE = 'DESTINATION_NOT_AVAILABLE',
  /** Cannot bind to binary file */
  EDITOR_BINARY_FILE = 'EDITOR_BINARY_FILE',
  /** Cannot bind to read-only file */
  EDITOR_READ_ONLY = 'EDITOR_READ_ONLY',
  /** No active text editor to bind to */
  NO_ACTIVE_EDITOR = 'NO_ACTIVE_EDITOR',
  /** User cancelled the replacement confirmation */
  USER_CANCELLED_REPLACEMENT = 'USER_CANCELLED_REPLACEMENT',
}
