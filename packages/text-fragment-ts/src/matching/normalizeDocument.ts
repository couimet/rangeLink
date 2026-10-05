import { isAsciiWhitespace } from './whitespace';

/** One space stands in for each collapsed whitespace run. */
const WHITESPACE_REPLACEMENT = ' ';

/**
 * A document prepared for matching, with the maps back to its raw offsets.
 *
 * Matching runs over `text`; every offset it produces is normalized. Both
 * mappers exist so a caller can hand in spans in raw offsets and get matches
 * back in raw offsets, with the normalization invisible at both edges.
 */
export interface NormalizedDocument {
  /** The document after end-of-line and whitespace normalization. */
  readonly text: string;
  /** Raw offset of the normalized character at an index, or the raw text's end. */
  readonly toRawOffset: (normalizedOffset: number) => number;
  /** Index in `text` of the first normalized character at or after a raw offset. */
  readonly toNormalizedOffset: (rawOffset: number) => number;
}

/**
 * Prepare a document for matching.
 *
 * Two normalizations run, in order, and one offset map covers both:
 * - every CRLF pair becomes a bare LF, so a link written against a CRLF file
 *   matches, and a match that spans the break still maps back to both code
 *   units;
 * - when `collapseWhitespace` is set, each run of whitespace becomes one
 *   space, which is how a renderer shows it.
 *
 * A collapsed run keeps the raw offset of its first character, so the offset
 * after the run is still the offset of the character that follows it. A match
 * that includes part of a run therefore maps back to the whole run, never to a
 * position inside it.
 */
export const normalizeDocument = (rawText: string, collapseWhitespace: boolean): NormalizedDocument => {
  const eolCharacters: string[] = [];
  const rawOffsets: number[] = [];
  let index = 0;
  while (index < rawText.length) {
    if (rawText[index] === '\r' && rawText[index + 1] === '\n') {
      eolCharacters.push('\n');
      rawOffsets.push(index);
      index += 2;
      continue;
    }
    eolCharacters.push(rawText[index]);
    rawOffsets.push(index);
    index += 1;
  }

  if (!collapseWhitespace) {
    return buildDocument(eolCharacters.join(''), rawOffsets, rawText.length);
  }

  const characters: string[] = [];
  const collapsedRawOffsets: number[] = [];
  let eolIndex = 0;
  while (eolIndex < eolCharacters.length) {
    if (isAsciiWhitespace(eolCharacters[eolIndex])) {
      characters.push(WHITESPACE_REPLACEMENT);
      collapsedRawOffsets.push(rawOffsets[eolIndex]);
      eolIndex += 1;
      while (eolIndex < eolCharacters.length && isAsciiWhitespace(eolCharacters[eolIndex])) {
        eolIndex += 1;
      }
      continue;
    }
    characters.push(eolCharacters[eolIndex]);
    collapsedRawOffsets.push(rawOffsets[eolIndex]);
    eolIndex += 1;
  }

  return buildDocument(characters.join(''), collapsedRawOffsets, rawText.length);
};

const buildDocument = (text: string, rawOffsets: number[], rawLength: number): NormalizedDocument => ({
  text,
  toRawOffset: (normalizedOffset: number): number => (normalizedOffset >= rawOffsets.length ? rawLength : rawOffsets[normalizedOffset]),
  // Binary search: rawOffsets ascends, so the answer is the first entry that
  // reaches the requested raw offset.
  toNormalizedOffset: (rawOffset: number): number => {
    let low = 0;
    let high = rawOffsets.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (rawOffsets[middle] < rawOffset) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  },
});
