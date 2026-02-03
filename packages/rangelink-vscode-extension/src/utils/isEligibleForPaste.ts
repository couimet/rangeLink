/**
 * Check if text is eligible for pasting to a destination.
 *
 * Validates text before paste operations to prevent:
 * - Null/undefined references
 * - Empty string pastes
 * - Whitespace-only pastes (no meaningful content)
 *
 * Used by ContentEligibilityChecker for all paste destinations.
 * Rejects empty strings and whitespace-only content.
 *
 * @param text - The text to validate (may be undefined)
 * @returns true if text has meaningful content, false otherwise
 */
export const isEligibleForPaste = (text: string | undefined): boolean => {
  // Reject undefined or empty
  if (!text) {
    return false;
  }

  // Reject whitespace-only strings
  if (text.trim().length === 0) {
    return false;
  }

  return true;
};
