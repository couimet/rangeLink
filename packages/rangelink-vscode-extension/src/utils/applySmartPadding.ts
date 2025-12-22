/**
 * Apply smart padding to text for paste operations
 *
 * Adds leading and trailing spaces to text only when needed, preventing
 * double-spacing issues when user has already padded text manually.
 *
 * Padding strategy:
 * - Add leading space only if text doesn't start with whitespace
 * - Add trailing space only if text doesn't end with whitespace
 * - Preserve existing whitespace (don't double-pad)
 *
 * @param text - The text to pad
 * @returns Padded text with smart spacing
 *
 * @remarks
 * Content validation (empty/whitespace-only) should be done by isEligibleForPaste()
 * before calling this function if filtering is needed.
 */
export const applySmartPadding = (text: string): string => {
  let result = text;

  // Add leading space if not present
  if (!/^\s/.test(text)) {
    result = ` ${result}`;
  }

  // Add trailing space if not present
  if (!/\s$/.test(text)) {
    result = `${result} `;
  }

  return result;
};
