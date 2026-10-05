import { DEFAULT_CASE_SENSITIVITY, DEFAULT_COLLAPSE_WHITESPACE, DEFAULT_MAX_CANDIDATES } from '../constants/textMatch';
import { TextFragmentError, TextFragmentErrorCodes } from '../errors';
import { BlockSpan, CaseSensitivity, MatchCandidate, TextDirective, TextFragmentResult, TextMatchOptions } from '../types';

import { NormalizedDocument, normalizeDocument } from './normalizeDocument';
import { skipWhitespace } from './whitespace';
import { isWordEndBoundary, isWordStartBoundary } from './wordBoundaries';

const FUNCTION_NAME = 'resolveTextFragmentMatch';

/**
 * Return every start index at which `needle` occurs in `text`, ascending.
 *
 * Overlapping occurrences are distinct candidates: searching `aa` in `aaa`
 * yields indices `[0, 1]`. An empty `needle` never occurs.
 *
 * The comparison is the caller's choice. Case-insensitive comparison is done
 * character by character rather than on a lowercased copy of the whole text,
 * because lowercasing can change a string's length and every offset here has
 * to survive the comparison unchanged.
 */
export const findOccurrences = (text: string, needle: string, caseSensitivity: CaseSensitivity = DEFAULT_CASE_SENSITIVITY): number[] => {
  const occurrences: number[] = [];
  if (needle.length === 0) {
    return occurrences;
  }
  for (let index = 0; index + needle.length <= text.length; index++) {
    if (matchesAt(text, index, needle, caseSensitivity)) {
      occurrences.push(index);
    }
  }
  return occurrences;
};

/** Everything the search needs beyond the text and the directive. */
interface MatchContext {
  readonly document: NormalizedDocument;
  readonly caseSensitivity: CaseSensitivity;
  /** Blocks in normalized offsets; empty means the whole document is one block. */
  readonly blockSpans: ReadonlyArray<BlockSpan>;
}

/**
 * Resolve a decoded text fragment directive against document text.
 *
 * The search follows the specification's find-a-range algorithm, over the text
 * the caller passes in rather than over a rendered page, so the defaults are
 * the browser's:
 * - a prefix must start on a word boundary, and the start term must follow it
 *   after whitespace only;
 * - the start term starts on a word boundary when no prefix precedes it, and
 *   ends on one unless a suffix relaxes that end;
 * - an end term must start on a word boundary, and ends on one unless a suffix
 *   follows it;
 * - a suffix sits after the match, past whitespace at most, and must end on a
 *   word boundary;
 * - each term lies inside one block, while a range match may cross blocks.
 *
 * Every matching place is returned, in document order, so a caller can offer
 * the reader a choice rather than a guess. The first entry is the place the
 * specification itself would settle on, because it stops at the first match the
 * algorithm accepts. An empty list means the directive matched nowhere.
 * Reaching `maxCandidates` more than once fails the result instead of returning
 * a truncated list, because a truncated list would hide the choices a reader
 * needs.
 */
export const resolveTextFragmentMatch = (rawText: string, directive: TextDirective, options: TextMatchOptions = {}): TextFragmentResult<MatchCandidate[]> => {
  const document = normalizeDocument(rawText, options.collapseWhitespace ?? DEFAULT_COLLAPSE_WHITESPACE);
  const context: MatchContext = {
    document,
    caseSensitivity: options.caseSensitivity ?? DEFAULT_CASE_SENSITIVITY,
    blockSpans: mapBlockSpans(options.blockSpans, document),
  };
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;

  const candidates: MatchCandidate[] = [];
  for (const startIndex of findStartIndexes(directive, context)) {
    for (const resolved of resolveFromStart(directive, startIndex, context)) {
      if (candidates.length >= maxCandidates) {
        return TextFragmentResult.err(
          new TextFragmentError({
            code: TextFragmentErrorCodes.MATCH_TOO_MANY_CANDIDATES,
            message: `Directive matches more than ${maxCandidates} places in the document`,
            functionName: FUNCTION_NAME,
            details: { maximum: maxCandidates },
          }),
        );
      }
      candidates.push({ start: document.toRawOffset(resolved.start), end: document.toRawOffset(resolved.end) });
    }
  }
  return TextFragmentResult.ok(candidates);
};

const matchesAt = (text: string, index: number, needle: string, caseSensitivity: CaseSensitivity): boolean => {
  if (caseSensitivity === 'sensitive') {
    return text.startsWith(needle, index);
  }
  for (let offset = 0; offset < needle.length; offset++) {
    const character = text[index + offset];
    if (character === undefined || character.toLowerCase() !== needle[offset].toLowerCase()) {
      return false;
    }
  }
  return true;
};

const isInsideOneBlock = (blockSpans: ReadonlyArray<BlockSpan>, start: number, end: number): boolean =>
  blockSpans.length === 0 || blockSpans.some((span) => span.start <= start && end <= span.end);

const mapBlockSpans = (rawSpans: ReadonlyArray<BlockSpan> | undefined, document: NormalizedDocument): ReadonlyArray<BlockSpan> =>
  (rawSpans ?? []).map((span) => ({ start: document.toNormalizedOffset(span.start), end: document.toNormalizedOffset(span.end) }));

/**
 * Where the start term begins, for every place it can.
 *
 * With no prefix the start term stands alone, so it must begin where a word
 * begins. With a prefix the prefix fixes the position instead: the prefix
 * anchors the match, so the start term only has to follow it, past whitespace
 * at most, and need not begin at a word boundary of its own.
 */
const findStartIndexes = (directive: TextDirective, context: MatchContext): number[] => {
  const { text } = context.document;
  const { start, prefix } = directive;
  const positions: number[] = [];
  const push = (index: number): void => {
    // Two prefix occurrences can skip the same whitespace run to one position,
    // which is a single place in the document, not two.
    if (positions[positions.length - 1] !== index) {
      positions.push(index);
    }
  };

  if (prefix === undefined) {
    for (const index of findOccurrences(text, start, context.caseSensitivity)) {
      if (isWordStartBoundary(text, index) && isInsideOneBlock(context.blockSpans, index, index + start.length)) {
        push(index);
      }
    }
    return positions;
  }

  for (const prefixIndex of findOccurrences(text, prefix, context.caseSensitivity)) {
    if (!isWordStartBoundary(text, prefixIndex) || !isInsideOneBlock(context.blockSpans, prefixIndex, prefixIndex + prefix.length)) {
      continue;
    }
    const index = skipWhitespace(text, prefixIndex + prefix.length);
    if (index === text.length || !matchesAt(text, index, start, context.caseSensitivity)) {
      continue;
    }
    if (isInsideOneBlock(context.blockSpans, index, index + start.length)) {
      push(index);
    }
  }
  return positions;
};

/**
 * Whether the suffix matches at the first non-whitespace position after `index`,
 * which is the only place the specification looks for it.
 */
const suffixMatchesAt = (suffix: string, index: number, context: MatchContext): boolean => {
  const { text } = context.document;
  const suffixIndex = skipWhitespace(text, index);
  if (!matchesAt(text, suffixIndex, suffix, context.caseSensitivity)) {
    return false;
  }
  return isInsideOneBlock(context.blockSpans, suffixIndex, suffixIndex + suffix.length) && isWordEndBoundary(text, suffixIndex + suffix.length);
};

/**
 * The spans a start term at `startIndex` resolves to, in document order.
 *
 * Empty when the start term resolves to nothing. A start term with no end term
 * yields at most one span; with an end term it yields one per qualifying end
 * occurrence, which is what lets a caller offer the reader a choice. The first
 * span is the one the specification would return, because the specification
 * stops at the first end occurrence that satisfies it.
 */
const resolveFromStart = (directive: TextDirective, startIndex: number, context: MatchContext): BlockSpan[] => {
  const { text } = context.document;
  const { start, end, suffix } = directive;
  const startEnd = startIndex + start.length;

  // The start term ends a word unless a suffix carries that job instead. An end
  // term does not relax it: the range has an end of its own.
  if ((end !== undefined || suffix === undefined) && !isWordEndBoundary(text, startEnd)) {
    return [];
  }

  if (end === undefined) {
    if (suffix !== undefined && !suffixMatchesAt(suffix, startEnd, context)) {
      return [];
    }
    return [{ start: startIndex, end: startEnd }];
  }

  const spans: BlockSpan[] = [];
  for (const endIndex of findOccurrences(text, end, context.caseSensitivity)) {
    if (endIndex < startEnd || !isWordStartBoundary(text, endIndex)) {
      continue;
    }
    if (!isInsideOneBlock(context.blockSpans, endIndex, endIndex + end.length)) {
      continue;
    }
    const rangeEnd = endIndex + end.length;
    if (suffix === undefined ? !isWordEndBoundary(text, rangeEnd) : !suffixMatchesAt(suffix, rangeEnd, context)) {
      continue;
    }
    spans.push({ start: startIndex, end: rangeEnd });
  }
  return spans;
};
