import { TextDirective } from '../types/TextDirective';

/**
 * Result of resolving a text highlight directive against a document's text.
 *
 * `start`/`end` are RAW offsets into the text passed to `resolveTextHighlight`
 * (the document's own bytes, CRLF included). Offsets are UTF-16 code-unit
 * indices, matching what VS Code's `document.positionAt` expects.
 */
export type TextMatchResult = { status: 'matched'; start: number; end: number } | { status: 'not-found' } | { status: 'ambiguous'; count: number };

/**
 * Collapse CRLF pairs to bare LF.
 *
 * Used on both the generation side and here so hand-authored `%0A` links also
 * match text in CRLF documents. Search offsets are computed against the
 * normalized text; callers translate them back to raw offsets with the
 * breakpoint map built alongside (see `resolveTextHighlight`).
 */
export const normalizeEOL = (text: string): string => text.replace(/\r\n/g, '\n');

/**
 * Return every start index at which `needle` occurs in `text`, ascending.
 *
 * Overlapping occurrences are distinct candidates: searching `aa` in `aaa`
 * yields indices `[0, 1]`. An empty `needle` never occurs.
 */
export const findOccurrences = (text: string, needle: string): number[] => {
  const occurrences: number[] = [];
  if (needle.length === 0) {
    return occurrences;
  }
  let from = 0;
  for (;;) {
    const index = text.indexOf(needle, from);
    if (index === -1) {
      break;
    }
    occurrences.push(index);
    from = index + 1;
  }
  return occurrences;
};

/**
 * Resolve a decoded text highlight directive against document text.
 *
 * RangeLink's own matching rulebook (not browser semantics):
 * - whole-document, exact, case-sensitive substring search;
 * - `prefix` and `suffix`, when supplied, must be immediately adjacent to the
 *   term they disambiguate (`prefix+start` / `suffix` right after `start`, or
 *   right after `end` when the range spans to an `end` term);
 * - `start,end` produces one candidate range per pair where an `end`
 *   occurrence begins at or after the `start` occurrence ends.
 *
 * A single candidate resolves to `matched`; zero to `not-found`; two or more
 * distinct candidates to `ambiguous`. Callers surface `ambiguous` and
 * `not-found` to the user rather than guessing, per the feature's "never
 * guess" guarantee.
 */
export const resolveTextHighlight = (rawText: string, directive: TextDirective): TextMatchResult => {
  // CRLF -> LF collapse, tracking where `\r`s were removed so matched
  // normalized offsets can be mapped back to raw document offsets.
  const { normalized, toRawOffset } = normalizeWithRawOffsets(rawText);
  const { prefix, start, end, suffix } = directive;

  const startIndexes: number[] = [];
  for (const index of findOccurrences(normalized, start)) {
    const prefixMatches = prefix === undefined || (index >= prefix.length && normalized.startsWith(prefix, index - prefix.length));
    if (!prefixMatches) {
      continue;
    }
    startIndexes.push(index);
  }

  if (end === undefined) {
    // Selection is just the `start` term. When a `suffix` was supplied it must
    // sit directly after `start`, so the whole `prefix+start+suffix` run is one
    // contiguous probe per candidate.
    const ranges: Array<{ start: number; end: number }> = [];
    for (const startIndex of startIndexes) {
      const suffixMatches =
        suffix === undefined || (startIndex + start.length + suffix.length <= normalized.length && normalized.startsWith(suffix, startIndex + start.length));
      if (!suffixMatches) {
        continue;
      }
      ranges.push({ start: startIndex, end: startIndex + start.length });
    }
    return classifyCandidates(ranges, toRawOffset);
  }

  // Range spans from the end of `start` through the end of a qualifying `end`
  // occurrence (suffix, if any, directly after that `end`).
  const endIndexes = findOccurrences(normalized, end);
  const ranges: Array<{ start: number; end: number }> = [];
  for (const startIndex of startIndexes) {
    const startEnd = startIndex + start.length;
    for (const endIndex of endIndexes) {
      if (endIndex < startEnd) {
        continue;
      }
      const rangeEnd = endIndex + end.length;
      const suffixMatches = suffix === undefined || (rangeEnd + suffix.length <= normalized.length && normalized.startsWith(suffix, rangeEnd));
      if (!suffixMatches) {
        continue;
      }
      ranges.push({ start: startIndex, end: rangeEnd });
    }
  }
  return classifyCandidates(ranges, toRawOffset);
};

type RawOffsetMapper = { normalized: string; toRawOffset: (normalizedOffset: number) => number };

const normalizeWithRawOffsets = (rawText: string): RawOffsetMapper => {
  let normalized = '';
  const breakpoints: number[] = [];
  for (let i = 0; i < rawText.length; i++) {
    if (rawText[i] === '\r' && rawText[i + 1] === '\n') {
      // The bare LF's normalized index is the number of chars emitted before
      // it; remember it so removed CRs can be re-inserted on the way back.
      breakpoints.push(normalized.length);
      normalized += '\n';
      i += 1; // skip the real `\n`; the bare LF above represents it
      continue;
    }
    normalized += rawText[i];
  }
  // For normalized offset n, the raw offset is n plus the count of removed CRs
  // whose LF sits strictly before n. A boundary exactly at an LF index is
  // BEFORE that newline (and maps before its CR), so it must not add the CR.
  const toRawOffset = (normalizedOffset: number): number => {
    let rawOffset = normalizedOffset;
    for (const breakpoint of breakpoints) {
      if (breakpoint < normalizedOffset) {
        rawOffset += 1;
      } else {
        break;
      }
    }
    return rawOffset;
  };
  return { normalized, toRawOffset };
};

// Candidate ranges are unique by construction (each `start`/`end` occurrence
// pair yields a distinct range), so ambiguity is simply range count.
const classifyCandidates = (ranges: Array<{ start: number; end: number }>, toRawOffset: (normalizedOffset: number) => number): TextMatchResult => {
  if (ranges.length === 0) {
    return { status: 'not-found' };
  }
  if (ranges.length > 1) {
    return { status: 'ambiguous', count: ranges.length };
  }
  return { status: 'matched', start: toRawOffset(ranges[0].start), end: toRawOffset(ranges[0].end) };
};
