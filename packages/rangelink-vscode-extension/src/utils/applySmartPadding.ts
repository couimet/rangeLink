/**
 * Apply smart padding to text for paste operations
 *
 * Adds leading and trailing spaces to text only when needed, preventing
 * double-spacing issues when user has already padded text manually.
 *
 * Padding strategy:
 * - Trim whitespace-only strings completely (no meaningful content)
 * - Add leading space only if text doesn't start with whitespace
 * - Add trailing space only if text doesn't end with whitespace
 * - Preserve existing whitespace (don't double-pad)
 *
 * @param text - The text to pad
 * @returns Padded text with smart spacing
 *
 * @remarks
 * This function assumes text has already been validated by isEligibleForPaste().
 * Calling with empty/whitespace-only strings will return empty string.
 */
export const applySmartPadding = (text: string): string => {
  // Trim whitespace-only strings completely
  if (text.trim().length === 0) {
    return '';
  }

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
