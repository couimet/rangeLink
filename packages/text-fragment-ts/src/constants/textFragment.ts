/**
 * Structural separators for text fragment links.
 *
 * A text fragment link identifies text by content:
 * `<path>:~:text=[prefix-,]start[,end][,-suffix]`
 * - `:~:` is the fixed separator directly after the path.
 * - `text=` introduces the directive value.
 * - `,` separates directive terms; `-` marks a prefix or suffix term.
 */
export const TEXT_FRAGMENT_SEPARATOR = ':~:';

export const TEXT_FRAGMENT_DIRECTIVE_PREFIX = 'text=';

/**
 * The combined separator+directive marker used to split a text fragment link
 * into its path and directive value (`path` + TEXT_FRAGMENT_DIRECTIVE + `value`).
 */
export const TEXT_FRAGMENT_DIRECTIVE = `${TEXT_FRAGMENT_SEPARATOR}${TEXT_FRAGMENT_DIRECTIVE_PREFIX}`;
