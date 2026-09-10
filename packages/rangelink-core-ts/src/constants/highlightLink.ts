/**
 * Structural separators for text highlight links.
 *
 * A highlight link identifies text by content:
 * `<path>:~:text=[prefix-,]start[,end][,-suffix]`
 * - `:~:` is the fixed separator directly after the path.
 * - `text=` introduces the directive value.
 * - `,` separates directive terms; `-` marks a prefix or suffix term.
 */
export const HIGHLIGHT_SEPARATOR = ':~:';

export const HIGHLIGHT_DIRECTIVE_PREFIX = 'text=';

/**
 * The combined separator+directive marker used to split a highlight link into
 * its path and directive value (`path` + HIGHLIGHT_TEXT_DIRECTIVE + `value`).
 */
export const HIGHLIGHT_TEXT_DIRECTIVE = `${HIGHLIGHT_SEPARATOR}${HIGHLIGHT_DIRECTIVE_PREFIX}`;
