/**
 * Whitespace, as HTML defines it.
 *
 * HTML's whitespace set is deliberately smaller than JavaScript's `\s`: a
 * non-breaking space is a character a reader sees, not a gap a renderer may
 * widen or drop, so matching must not skip over it.
 */
const ASCII_WHITESPACE = /[ \t\n\f\r]/;

/** Whether a character is whitespace that a renderer collapses. */
export const isAsciiWhitespace = (character: string): boolean => ASCII_WHITESPACE.test(character);

/**
 * Index of the first non-whitespace character at or after `index`.
 *
 * Returns the text's length when only whitespace remains. The specification
 * uses this step to let a suffix sit after the intervening space rather than
 * against it, so `quick,-bro` reaches `brown` from `quick`.
 */
export const skipWhitespace = (text: string, index: number): number => {
  let cursor = index;
  while (cursor < text.length && isAsciiWhitespace(text[cursor])) {
    cursor += 1;
  }
  return cursor;
};
