/**
 * Check if text is eligible for pasting to a destination.
 *
 * Validates text before paste operations to prevent:
 * - Null/undefined references
 * - Empty string pastes
 *
 * Whitespace-only content is intentional — if a user selects whitespace
 * (terminal output, code indentation, etc.), RangeLink relays it as-is.
 *
 * Used by ContentEligibilityChecker for all paste destinations.
 *
 * @param text - The text to validate (may be undefined)
 * @returns true if text is defined and non-empty, false otherwise
 */
export const isEligibleForPaste = (text: string | undefined): boolean => {
  if (!text) {
    return false;
  }

  return true;
};
