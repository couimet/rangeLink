/**
 * Ported from web-platform-tests, which is distributed under the 3-Clause BSD
 * license. See the NOTICE file at the repository root.
 */

/** The line break a reader sees between two blocks. */
const BLOCK_SEPARATOR = '\n';

/**
 * A ported target page, laid out as the text a browser searches.
 */
export interface WptDocument {
  /** The visible text, blocks in document order. */
  readonly text: string;

  /** The block names, in document order. */
  readonly blockNames: ReadonlyArray<string>;

  /** The name of the block holding a character offset, or undefined when none does. */
  readonly blockNameAt: (offset: number) => string | undefined;
}

interface BlockSpan {
  readonly name: string;
  readonly start: number;
  readonly end: number;
}

/**
 * Lay out named blocks as one plain-text document.
 *
 * A browser searches the rendered text of a page, and each block here is one
 * run of text a reader sees, joined by the line break between them. What the
 * browser hides is absent: `display: none` subtrees, `visibility: hidden`
 * subtrees, iframes, images and text a `::before` rule generates. What it
 * searches outside the main tree is present: an open shadow root contributes
 * its text like any other block.
 *
 * The blocks name regions rather than constrain the search, so a case's
 * expectation can say where the match lands without claiming the block
 * boundaries a browser would draw. Those are the part of the corpus a
 * plain-text document cannot carry, and the cases that turn on them are
 * recorded as not applicable.
 */
export const buildDocument = (blocks: Readonly<Record<string, string>>): WptDocument => {
  const spans: BlockSpan[] = [];
  const parts: string[] = [];
  let offset = 0;

  for (const [name, text] of Object.entries(blocks)) {
    spans.push({ name, start: offset, end: offset + text.length });
    parts.push(text);
    offset += text.length + BLOCK_SEPARATOR.length;
  }

  const blockNameAt = (offset: number): string | undefined => spans.find((span) => offset >= span.start && offset < span.end)?.name;

  return {
    text: parts.join(BLOCK_SEPARATOR),
    blockNames: spans.map((span) => span.name),
    blockNameAt,
  };
};
