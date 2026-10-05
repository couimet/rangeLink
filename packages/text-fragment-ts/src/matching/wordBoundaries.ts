/**
 * Word boundaries, as the text fragment specification defines them.
 *
 * A word character is a Unicode letter, a Unicode digit, or an underscore.
 * Everything else, punctuation and whitespace and symbols alike, separates
 * words. A match is word-start bounded when the character before it is not a
 * word character, and word-end bounded when the character after it is not.
 * The document's own edges bound a match at either end.
 */
const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

/** Whether the character at `index` is a word character. */
export const isWordCharacter = (text: string, index: number): boolean => index >= 0 && index < text.length && WORD_CHARACTER.test(text[index]);

/**
 * Whether a match starting at `index` begins on a word boundary.
 *
 * A browser requires this of a prefix and of a start term that has no prefix
 * in front of it, which is what stops `u-` from matching the `u` inside
 * `jumped`.
 */
export const isWordStartBoundary = (text: string, index: number): boolean => !isWordCharacter(text, index - 1);

/**
 * Whether a match ending at `index` ends on a word boundary.
 *
 * A browser requires this of a start term unless an end term or a suffix
 * relaxes it, of an end term unless a suffix follows it, and always of a
 * suffix. That is what separates the word `bro` from the start of `brown`.
 */
export const isWordEndBoundary = (text: string, index: number): boolean => !isWordCharacter(text, index);
