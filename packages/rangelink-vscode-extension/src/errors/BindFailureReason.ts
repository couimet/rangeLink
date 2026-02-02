/**
 * Specific reasons why a bind operation failed.
 * Used as details within DESTINATION_BIND_FAILED errors.
 *
 * These provide structured context for API consumers without
 * proliferating top-level error codes.
 */
export enum BindFailureReason {
  ALREADY_BOUND_TO_SAME = 'ALREADY_BOUND_TO_SAME',
  DESTINATION_NOT_AVAILABLE = 'DESTINATION_NOT_AVAILABLE',
  EDITOR_BINARY_FILE = 'EDITOR_BINARY_FILE',
  EDITOR_READ_ONLY = 'EDITOR_READ_ONLY',
  NO_ACTIVE_EDITOR = 'NO_ACTIVE_EDITOR',
  REQUIRES_SPLIT_EDITOR = 'REQUIRES_SPLIT_EDITOR',
  USER_CANCELLED_REPLACEMENT = 'USER_CANCELLED_REPLACEMENT',
}
