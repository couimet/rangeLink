# text-fragment-ts

[![Codecov](https://img.shields.io/codecov/c/github/couimet/rangeLink?flag=text-fragment-ts)](https://app.codecov.io/gh/couimet/rangeLink/flags/text-fragment-ts)

**Parse, format and match `:~:text=` fragment directives.**

## Overview

This package owns the text fragment link grammar: the `:~:text=` fragment
directive that a URL uses to point at text inside a document. It parses a link
into a raw path plus a decoded directive, formats a directive back into a link,
and resolves a directive against a document's text.

The grammar is the one the WICG Text Fragments work defines, and matching
follows that work's own find-a-range algorithm, so a link that scrolls in a
browser resolves here too. Everything the package emits and accepts is a
fragment link as a URL would carry it, which is what makes links it writes
readable by a browser and links a browser wrote readable by it.

## Entry points

| Export                                                | Purpose                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `parseTextFragment(link)`                             | Link in, `ParsedTextFragment` (`path` plus `directive`) out |
| `formatTextFragment(path, directive)`                 | Path plus directive in, raw link out                        |
| `resolveTextFragmentMatch(text, directive, options?)` | Every place the directive matches, in raw document offsets  |
| `findOccurrences(text, needle, caseSensitivity?)`     | Every start index of a substring, overlapping included      |
| `normalizeDocument(text, collapseWhitespace)`         | Text ready for matching, plus the maps back to raw offsets  |
| `isWordStartBoundary(text, index)`                    | Whether a match there begins on a word boundary             |
| `isWordEndBoundary(text, index)`                      | Whether a match there ends on a word boundary               |
| `TextFragmentResult`                                  | `Result<T, TextFragmentError \| PercentCodecError>`         |
| `TextFragmentError` / `TextFragmentErrorCodes`        | The package's own error class and code enum                 |
| `TextDirective`                                       | Decoded `prefix` / `start` / `end` / `suffix` terms         |
| `TextMatchOptions`                                    | Case, whitespace, block spans and the candidate maximum     |
| `MatchCandidate`                                      | One matching place, as a raw `start` and `end`              |
| `ParsedTextFragment`                                  | A parsed link: raw path plus decoded directive              |

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

## Matching follows the browser's rules

`resolveTextFragmentMatch` implements the specification's find-a-range
algorithm over the text a caller passes in, so its defaults are a browser's:

- Case-insensitive comparison.
- Whitespace runs read as one space, and a match may span a line break.
- A prefix must begin on a word boundary, and the start term follows it past
  whitespace at most. The start term begins on a word boundary when no prefix
  precedes it, and ends on one unless a suffix relaxes that end. An end term
  begins on a word boundary and ends on one unless a suffix follows it. A
  suffix sits past whitespace at most and ends on a word boundary.
- Each term lies inside one block, while a range match may cross from one block
  into another.

Every matching place comes back in document order, so a caller can offer the
reader a choice instead of a guess. An empty list means the directive matched
nowhere. When more places match than `maxCandidates` allows, the call fails with
`MATCH_TOO_MANY_CANDIDATES` rather than returning a list that hides choices.

Each of those rules is a default, not a decision: `TextMatchOptions` carries
`caseSensitivity`, `collapseWhitespace`, `blockSpans` and `maxCandidates`, which
is how a host states a policy of its own without forking the matcher.

Matching runs over normalized text and maps the result back to raw document
offsets, so a CRLF document and an LF document with the same content resolve to
the same range. The details live in `src/matching/textMatch.ts`, and the
conformance suite ported from web-platform-tests lives in
`src/__tests__/fixtures/wpt/`.

[DESIGN.md](./DESIGN.md) records where those rules come from, which corpus the
suite was ported from and at which revision, and the three places where the port
stops short of a browser.

## Duplicated leaf material

The package deliberately duplicates a few small leaves rather than importing
them: `MAX_LINK_LENGTH` and the four link-parsing codes that numeric parsing
also uses (`PARSE_LINK_TOO_LONG`, `PARSE_EMPTY_LINK`, `PARSE_EMPTY_PATH`,
`PARSE_URL_NOT_SUPPORTED`). The string values are identical to the counterpart
in `rangelink-core-ts`, so the duplication is invisible at runtime and visible
only where an error's origin matters. The dependency direction stays one-way: of
the packages in this repository, this one imports `percent-codec-ts` and nothing
else.

## Usage

```typescript
import { formatTextFragment, parseTextFragment, resolveTextFragmentMatch } from 'text-fragment-ts';

const link = formatTextFragment('src/file.ts', { prefix: 'const ', start: 'value' });
// 'src/file.ts:~:text=const%20-,value'

const parsed = parseTextFragment(link.value);
if (parsed.success) {
  const matches = resolveTextFragmentMatch(documentText, parsed.value.directive);
  if (matches.success) {
    console.log(matches.value);
  }
}
```
