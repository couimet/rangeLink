/**
 * Padding modes for smart padding operations.
 *
 * - `both` - Add leading and trailing spaces (prevents concatenation on both sides)
 * - `before` - Add leading space only
 * - `after` - Add trailing space only
 * - `none` - No padding (return text as-is)
 */
export type PaddingMode = 'both' | 'before' | 'after' | 'none';

interface PaddingBehavior {
  readonly addBefore: boolean;
  readonly addAfter: boolean;
}

const PADDING_BEHAVIORS: Record<PaddingMode, PaddingBehavior> = {
  both: { addBefore: true, addAfter: true },
  before: { addBefore: true, addAfter: false },
  after: { addBefore: false, addAfter: true },
  none: { addBefore: false, addAfter: false },
};

/**
 * Apply smart padding to text for paste operations
 *
 * Adds leading and/or trailing spaces to text based on the specified mode,
 * preventing double-spacing when text already has appropriate whitespace.
 *
 * Padding strategy:
 * - `none` mode: Return text unchanged
 * - `before` mode: Add leading space only if text doesn't start with whitespace
 * - `after` mode: Add trailing space only if text doesn't end with whitespace
 * - `both` mode: Add both leading and trailing spaces where missing
 * - Preserve existing whitespace (don't double-pad)
 *
 * @param text - The text to pad
 * @param mode - Padding mode: 'both' (default), 'before', 'after', or 'none'
 * @returns Padded text with smart spacing based on mode
 *
 * @remarks
 * Content validation (empty/whitespace-only) should be done by isEligibleForPaste()
 * before calling this function if filtering is needed.
 */
export const applySmartPadding = (text: string, mode: PaddingMode = 'both'): string => {
  const { addBefore, addAfter } = PADDING_BEHAVIORS[mode];

  let result = text;

  if (addBefore && !/^\s/.test(text)) {
    result = ` ${result}`;
  }

  if (addAfter && !/\s$/.test(text)) {
    result = `${result} `;
  }

  return result;
};
