# text-fragment-ts

[![Codecov](https://img.shields.io/codecov/c/github/couimet/rangeLink?flag=text-fragment-ts)](https://app.codecov.io/gh/couimet/rangeLink/flags/text-fragment-ts)

**Parse, format and match `:~:text=` fragment directives - one dependency, `percent-codec-ts`.**

## Overview

This package owns the text fragment link grammar: the `:~:text=` fragment
directive that a URL uses to point at text inside a document. It parses a link
into a raw path plus a decoded directive, formats a directive back into a link,
and resolves a directive against a document's text.

The grammar is the one the WICG Text Fragments work defines, with RangeLink's
own matching rules layered on top (see below). Everything the package emits and
accepts is a fragment link as a URL would carry it, which is what makes links it
writes readable by a browser and links a browser wrote readable by it.

## Entry points

| Export                                         | Purpose                                                     |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `parseTextFragment(link)`                      | Link in, `ParsedTextFragment` (`path` plus `directive`) out |
| `formatTextFragment(path, directive)`          | Path plus directive in, raw link out                        |
| `resolveTextFragmentMatch(text, directive)`    | `matched` / `not-found` / `ambiguous` against document text |
| `findOccurrences(text, needle)`                | Every start index of a substring, overlapping included      |
| `normalizeEOL(text)`                           | Collapse CRLF pairs to LF                                   |
| `TextFragmentResult`                           | `Result<T, TextFragmentError \| PercentCodecError>`         |
| `TextFragmentError` / `TextFragmentErrorCodes` | The package's own error class and code enum                 |
| `TextDirective`                                | Decoded `prefix` / `start` / `end` / `suffix` terms         |
| `ParsedTextFragment`                           | A parsed link: raw path plus decoded directive              |

## Quoting is the caller's job

`parseTextFragment` accepts a link that was wrapped in single or double quotes
and strips them, because reading a quoted link is part of parsing. It returns
the path raw: the returned `path` is never a quoted string.

`formatTextFragment` does not quote at all. It takes a raw path and returns the
raw link, path plus directive, with no surrounding quotes even when the path
contains a space or a `#`. Outbound quoting is a policy of the layer that knows
where the link is going, so the caller applies it.

The asymmetry is deliberate: quotes that arrive are read, quotes that leave are
the caller's decision.

## Matching follows RangeLink's rulebook, not the browser's

`resolveTextFragmentMatch` is not a reimplementation of a browser's scroll-to-
text behaviour, and a link that scrolls in Chrome may be `not-found` or
`ambiguous` here. RangeLink's rules are:

- Whole-document, exact, case-sensitive substring search. No fuzzy matching, no
  whitespace normalization, no scoring.
- `prefix` and `suffix`, when present, must be immediately adjacent to the term
  they disambiguate.
- `start,end` yields one candidate per pair where an `end` occurrence begins at
  or after the `start` occurrence ends.
- One candidate matches, zero is `not-found`, two or more is `ambiguous`.
  Callers surface both non-matching outcomes instead of guessing, so a link
  never silently navigates to the wrong place.

Matching operates on LF-normalized text and maps the result back to raw
document offsets, so a CRLF document and an LF document with the same content
resolve to the same range. The details live in `src/matching/textMatch.ts`.

## Duplicated leaf material

The package deliberately duplicates a few small leaves rather than importing
them: `MAX_LINK_LENGTH` and the four link-parsing codes that numeric parsing
also uses (`PARSE_LINK_TOO_LONG`, `PARSE_EMPTY_LINK`, `PARSE_EMPTY_PATH`,
`PARSE_URL_NOT_SUPPORTED`). The string values are identical to the counterpart
in `rangelink-core-ts`, so the duplication is invisible at runtime and visible
only where an error's origin matters. The dependency direction stays one-way:
this package imports `percent-codec-ts` and nothing else.

## Usage

```typescript
import { formatTextFragment, parseTextFragment, resolveTextFragmentMatch } from 'text-fragment-ts';

const link = formatTextFragment('src/file.ts', { prefix: 'const ', start: 'value' });
// 'src/file.ts:~:text=const%20-,value'

const parsed = parseTextFragment(link.value);
if (parsed.success) {
  console.log(resolveTextFragmentMatch(documentText, parsed.value.directive));
}
```
