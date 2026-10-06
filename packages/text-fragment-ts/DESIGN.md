# Text fragment matching: design

This document records how text-fragment-ts decides what a `:~:text=` directive selects, where those rules come from, and where the package stops short of a browser. It is written for a reader who has to judge whether the package's answer can be trusted for a given document.

## The work this package follows

The fragment directive grammar comes from the Text Fragments work of the WICG. That work is a draft, not an IETF standard, and a browser implements it as an experiment. Only one layer of a text fragment link is standardised: the percent-encoding of each term follows RFC 3986. The grammar of the directive, and the find-a-range algorithm that decides which text a directive selects, come from the WICG draft.

The package follows the draft, because the draft is the only text that both a browser and this repository can cite. Where a browser and the draft disagree, the package matches the draft.

## The conformance suite ported from web-platform-tests

Rules taken from a draft need a test bed that does not come from this repository. That test bed is a port of the web-platform-tests corpus for scroll-to-text fragments, which lives at https://github.com/web-platform-tests/wpt/tree/7f439c226694df407f6ae71b7a86a3794cc67776/scroll-to-text-fragment and was read there on 2026-10-01. Every pointer below names that same revision, `7f439c226694df407f6ae71b7a86a3794cc67776`. web-platform-tests distributes the corpus under the 3-Clause BSD license, and the NOTICE file at the repository root records that.

The port brought over every case it could, and adapted each one to a text-level document. Three source files gave cases. The find-a-range file, [find-range-from-text-directive.html](https://github.com/web-platform-tests/wpt/blob/7f439c226694df407f6ae71b7a86a3794cc67776/scroll-to-text-fragment/find-range-from-text-directive.html), observes whether the page scrolled after a browser read the directive. The context file, [scroll-to-text-fragment.html](https://github.com/web-platform-tests/wpt/blob/7f439c226694df407f6ae71b7a86a3794cc67776/scroll-to-text-fragment/scroll-to-text-fragment.html), observes which section of the target page a browser landed on. The percent file, [percent-encoding.html](https://github.com/web-platform-tests/wpt/blob/7f439c226694df407f6ae71b7a86a3794cc67776/scroll-to-text-fragment/percent-encoding.html), observes which paragraph a browser landed on. The target page each find-a-range case runs against, [find-range-from-text-directive-target.html](https://github.com/web-platform-tests/wpt/blob/7f439c226694df407f6ae71b7a86a3794cc67776/scroll-to-text-fragment/find-range-from-text-directive-target.html), is the text the port transcribes into its own document constant.

Each case becomes one test. The test title carries the case identifier, the source description word for word, and a permalink to the exact line the case was transcribed from. The permalink embeds the revision above, so it keeps pointing at the lines this port was written against, whatever the upstream files do later.

The case data lives in `src/__tests__/fixtures/wpt/`. The tests that run the data live in `src/__tests__/matching/wpt/`. A fixture test beside the data checks each case for a pinned permalink, a unique identifier, and a block name its own document holds.

### Cases that do not run

Some cases cannot run against a text-level matcher. The port records those instead of dropping them, and each one appears in the run as a skipped test, with its outcome and its reason in the title. The reasons are:

- `multiple-directives` - the fragment carries several directives joined by an ampersand. A browser tries each directive in turn, while this grammar reads one directive per fragment.
- `element-fragment` - the case pairs a text directive with an element fragment, and the observation is the element a browser lands on rather than any matched text.
- `dom-block-boundary` - the case turns on a block boundary that a hidden block-level element draws inside a run of text, and a plain-text document carries no block boundaries.
- `unscrolled-match` - the case reads a scroll position to prove that a browser did NOT move. A position cannot tell a match a browser keeps out of view from a miss.

## The document model

A browser searches rendered text, so its rules speak about layout. This package searches a string, so a reader needs to know which part of a page a string stands for. The model is the text a reader sees: the visible text of the document in order, with one line break between two blocks.

What a browser hides, the model leaves out. A subtree under `display: none` contributes nothing, a subtree under `visibility: hidden` contributes nothing, an iframe contributes its own document rather than its contents, and an image contributes no text. What a browser searches outside the main tree, the model keeps: an open shadow root contributes its text like any other block.

A caller that knows more about its document than the model assumes passes `blockSpans` to `resolveTextFragmentMatch`. A span names a region of the document by its offsets. A term must then lie inside one span, while a range match may cross from one span into another. The spans need not cover the document.

## Word boundaries

A word character is a Unicode letter, a Unicode digit, or an underscore. Everything else separates words, punctuation and whitespace and symbols alike. A match is word-start bounded when the character before it is not a word character, and word-end bounded when the character after it is not. The document's own edges bound a match at either end.

The algorithm requires these boundaries in four places. A prefix must start on one, and the start term follows the prefix past whitespace at most. A start term with no prefix starts on one, and ends on one unless a suffix relaxes that end. An end term starts on one, and ends on one unless a suffix follows it. A suffix ends on one. src/matching/wordBoundaries.ts holds these rules.

## Whitespace

Whitespace here is the set HTML defines: space, tab, line feed, form feed, and carriage return. JavaScript's `\s` is a wider set, and the difference matters. A non-breaking space is a character a reader sees, not a gap a renderer may widen or drop, so matching must not skip it.

## Normalization and offsets

Two normalizations run before matching, and one offset map covers both. Every CRLF pair becomes one LF, so a link written against a CRLF file matches the same file with LF endings. Then, when `collapseWhitespace` is set, every run of whitespace becomes one space, which is how a renderer shows it.

A collapsed run keeps the raw offset of its first character, so the offset after the run is still the offset of the character that follows it. A match that covers part of a run therefore maps back to the whole run, never to a position inside it. The matcher reports every result in raw document offsets, which is what a caller needs to place a cursor. src/matching/normalizeDocument.ts holds the mapping.

## Defaults

Each default is the answer a browser gives, so a caller that supplies no options gets browser behaviour:

- `DEFAULT_CASE_SENSITIVITY` is `insensitive`. A browser has compared text fragments without regard to case since Chrome M77.
- `DEFAULT_COLLAPSE_WHITESPACE` is `true`, because a browser matches against rendered text, where a whitespace run reads as one space.
- `DEFAULT_MAX_CANDIDATES` bounds the places one call collects, so a directive built from a single character cannot walk a whole document.

Each of those is a setting rather than a decision. `TextMatchOptions` carries `caseSensitivity`, `collapseWhitespace`, `blockSpans` and `maxCandidates`, which is how a host states a policy of its own without forking the matcher. A host that wants exact, case-sensitive, adjacency-based matching, as RangeLink does for source files, sets those options instead of forking.

Reaching the candidate maximum fails the call with `MATCH_TOO_MANY_CANDIDATES` rather than returning a truncated list, because a truncated list would hide choices a reader needs. The exact count is unknown once collection stops, so the error names the limit rather than a total.

## Percent decoding

The percent layer follows RFC 3986 where the package can afford to, and follows a browser where it cannot. The two halves live in different packages.

percent-codec-ts owns the strict half. A well-formed escape decodes there, and a run of bytes that is not valid UTF-8 fails there, with that package's error.

The directive layer above it owns the lenient half, because a browser is lenient. A percent sign that two hexadecimal digits do not follow is literal text, so `#:~:text=%` selects a document's `%` and `#:~:text=%%` selects its `%%`. Chrome resolves both, so refusing them here would refuse a link a browser follows. src/parsing/parseTextFragment.ts walks each term, hands every well-formed run to the codec, and keeps a stray percent as itself.

The terms themselves are split on the raw comma before any decoding, then classified by position. A leading term that ends in a hyphen is the prefix, a trailing term that starts with a hyphen is the suffix, and the middle must be one term or two. A structure that does not fit fails instead of being guessed at.

## Fidelity limits

The port is faithful to the corpus where a text-level document can be, and it deviates in three places a reader should know about.

The first limit is the document model itself. A case that turns on a block boundary inside a run of text cannot be expressed over a string, and the port records it as `dom-block-boundary`. Rendering is what draws that boundary, so no string model recovers it.

The second limit is the observable. A browser answers with a scroll position or a highlighted element, and both are facts about a viewport. The port keeps the part a text matcher can answer, which is where the first match starts, and records the cases whose answer is a position rather than a match as `unscrolled-match`.

The third limit is a transcription choice. The target page of the find-a-range corpus separates the words in its Lorem region with non-breaking spaces, and this package's whitespace set excludes a non-breaking space. A byte-exact transcription would therefore fail the two cases that cross such a separator. The port transcribes those separators as ordinary spaces, so those two cases pass here under this package's own whitespace rule, and this note records that the two documents are not byte-identical. Text a `::before` rule generates is the mirror case: a reader sees it, so the port gives it a block of its own.
