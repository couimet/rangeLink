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
  const collapseWhitespace = options.collapseWhitespace ?? DEFAULT_COLLAPSE_WHITESPACE;
  const document = normalizeDocument(rawText, collapseWhitespace);
  const terms = normalizeDirectiveTerms(directive, collapseWhitespace);
  const context: MatchContext = {
    document,
    caseSensitivity: options.caseSensitivity ?? DEFAULT_CASE_SENSITIVITY,
    blockSpans: mapBlockSpans(options.blockSpans, document),
  };
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  // Neither the end term's occurrences nor their eligibility depends on the
  // start index, and a single document can hold many start indexes, so both run
  // once here rather than once per start index.
  const { end: endTerm, suffix } = terms;
  const endOccurrences =
    endTerm === undefined
      ? []
      : findOccurrences(document.text, endTerm, context.caseSensitivity).filter((endIndex) => canEndRangeAt(endIndex, endTerm, suffix, context));

  const candidates: MatchCandidate[] = [];
  for (const startIndex of findStartIndexes(terms, context)) {
    for (const resolved of resolveFromStart(terms, startIndex, context, endOccurrences)) {
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

/**
 * Prepare a directive for a search over a normalized document.
 *
 * Every term must reach the search in the document's own shape, or a term cut
 * from a CRLF file, or one that carries a run of whitespace, never matches the
 * text it came from. Terms are normalized with the same setting as the
 * document, so the two sides always agree.
 */
const normalizeDirectiveTerms = (directive: TextDirective, collapseWhitespace: boolean): TextDirective => {
  const term = (value: string): string => normalizeDocument(value, collapseWhitespace).text;
  return {
    start: term(directive.start),
    ...(directive.prefix !== undefined && { prefix: term(directive.prefix) }),
    ...(directive.end !== undefined && { end: term(directive.end) }),
    ...(directive.suffix !== undefined && { suffix: term(directive.suffix) }),
  };
};

/**
 * The position of the first occurrence at or after `index`, for an ascending
 * occurrence list.
 */
const firstOccurrenceAtOrAfter = (occurrences: ReadonlyArray<number>, index: number): number => {
  let low = 0;
  let high = occurrences.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (occurrences[middle] < index) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
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

/**
 * Whether an end term occurrence can close a range.
 *
 * None of these rules reads the start index, so one pass over the end term's
 * occurrences settles every start at once. An occurrence that fails here can
 * never become a span, which is why the caller filters before it iterates
 * starts: `maxCandidates` bounds the candidates a search collects, and a
 * filtered-out occurrence collects none.
 */
const canEndRangeAt = (endIndex: number, endTerm: string, suffix: string | undefined, context: MatchContext): boolean => {
  const { text } = context.document;
  if (!isWordStartBoundary(text, endIndex)) {
    return false;
  }
  const rangeEnd = endIndex + endTerm.length;
  if (!isInsideOneBlock(context.blockSpans, endIndex, rangeEnd)) {
    return false;
  }
  return suffix === undefined ? isWordEndBoundary(text, rangeEnd) : suffixMatchesAt(suffix, rangeEnd, context);
};

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
 * yields at most one span; with an end term it yields one per end occurrence,
 * which is what lets a caller offer the reader a choice. The first span is the
 * one the specification would return, because the specification stops at the
 * first end occurrence that satisfies it.
 *
 * The caller passes the end term's occurrences already filtered by
 * `canEndRangeAt`, so every one of them closes a range.
 */
const resolveFromStart = (directive: TextDirective, startIndex: number, context: MatchContext, endOccurrences: ReadonlyArray<number>): BlockSpan[] => {
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
  for (let occurrence = firstOccurrenceAtOrAfter(endOccurrences, startEnd); occurrence < endOccurrences.length; occurrence++) {
    const rangeEnd = endOccurrences[occurrence] + end.length;
    spans.push({ start: startIndex, end: rangeEnd });
  }
  return spans;
};
