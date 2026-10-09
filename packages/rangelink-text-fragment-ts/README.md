# rangelink-text-fragment-ts

[![Codecov](https://img.shields.io/codecov/c/github/couimet/rangeLink?flag=rangelink-text-fragment-ts)](https://app.codecov.io/gh/couimet/rangeLink/flags/rangelink-text-fragment-ts)

**RangeLink's text fragment policy - one import site for the `:~:text=` codec and the decision it leaves open.**

## Overview

This package is the layer RangeLink builds on top of text-fragment-ts. It re-exports that package's parsing and formatting entry points unchanged, so a RangeLink consumer imports the codec once and gets the policy with it, and it adds the one entry point the codec deliberately leaves open: deciding what a directive's matches mean.

The codec answers with every place a directive matches and hands the choice back. That is the right contract for a browser-faithful package, and the wrong one for a host that has to act on the answer. This layer turns the list into a decision. One place is a match, none is a miss, and several is a question for the reader, who is the only one who knows which occurrence the link meant.

## Entry points

| Export                                                        | Purpose                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `matchTextFragmentInDocument(document, directive, settings?)` | Resolve a directive into a match, a miss, or a list of candidates  |
| `TextFragmentMatchSettings`                                   | The policy for one call: case, maximum, block spans and whitespace |
| `TextFragmentMatchOutcome`                                    | What one attempt settled on                                        |
| `TextFragmentCasePolicy`                                      | `sensitive`, `insensitive`, or `prefer-sensitive`                  |
| every `text-fragment-ts` export                               | Parsing, formatting, matching and the directive types              |

## The case policy

`prefer-sensitive` is the default, and it is a two-pass search. The first pass matches the directive's text exactly. The second pass runs without regard to case, and it runs only when the first pass found nothing.

That ordering is what makes the policy safe. A link whose text is written exactly as the document writes it resolves to that one place, and a link that matches nowhere is widened to every case variant rather than refused. Widening never adds choices to a search that was already unambiguous.

A refusal is not an empty result. When a search cannot finish within its candidate maximum, the call fails instead of returning a short list, and that failure travels back through both passes without a retry, because a retry would only repeat it.

## Why the layer exists

It owns the case policy, which is RangeLink's judgement rather than a browser's, and it owns it as one named setting instead of a two-pass dance every caller would otherwise repeat. It owns the outcome, so a caller reads a decision rather than a list it has to interpret. And it holds the settings per call rather than on an instance, so a caller whose configuration changed passes the new values on its next call with nothing to rebuild.

Everything the codec already answers well stays the codec's: the grammar, the percent handling, the word-boundary rules, and the candidate positions themselves.

## Usage

```typescript
import { matchTextFragmentInDocument, parseTextFragment } from 'rangelink-text-fragment-ts';

const parsed = parseTextFragment('src/file.ts:~:text=const%20-,value');
if (parsed.success) {
  const matched = matchTextFragmentInDocument(documentText, parsed.value.directive, {
    casePolicy: 'prefer-sensitive',
    maxCandidates: 10,
  });
  if (matched.success) {
    switch (matched.value.status) {
      case 'matched':
        console.log(matched.value.start, matched.value.end);
        break;
      case 'not-found':
        break;
      case 'ambiguous':
        console.log(matched.value.candidates);
        break;
    }
  }
}
```

## Related

- [Text fragment codec README](../text-fragment-ts/README.md) - the grammar and the matcher this layer configures
- [Percent codec README](../percent-codec-ts/README.md) - the percent encoding both use
