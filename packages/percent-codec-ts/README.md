# percent-codec-ts

[![Codecov](https://img.shields.io/codecov/c/github/couimet/rangeLink?flag=percent-codec-ts)](https://app.codecov.io/gh/couimet/rangeLink/flags/percent-codec-ts)

**RFC 3986 percent-encoding with strict UTF-8 decoding - zero runtime dependencies.**

## Overview

This package owns the two directions of percent-encoding as they appear in a URL
fragment: `encodePercentUTF8` writes text as percent-escaped UTF-8 octets, and
`decodePercentUTF8` reads them back with full malformed-input typing. Nothing in
it is specific to any one link grammar, so it is a general-purpose codec that
happens to have its first consumer in `text-fragment-ts`.

## Entry points

| Export                       | Purpose                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `encodePercentUTF8(text)`    | Percent-escape a string, one `%XX` per UTF-8 byte, uppercase hex |
| `decodePercentUTF8(encoded)` | Decode back to text, returning a `PercentCodecResult<string>`    |
| `PercentCodecError`          | Error class thrown at both decode failure points                 |
| `PercentCodecErrorCodes`     | `PERCENT_DECODE_MALFORMED`, `PERCENT_DECODE_INVALID_UTF8`        |
| `PercentCodecResult`         | `Result<string, PercentCodecError>`                              |

## Encoding rules

Octets in the ASCII raw set pass through unescaped: `A-Z`, `a-z`, `0-9`, and
`-_.!~*'()`. That is the set `encodeURIComponent` keeps literal, not the
narrower `[A-Za-z0-9]` the text-fragment draft names. The difference matters in
both directions: our encoder has to emit those bytes unescaped or links we write
stop detecting links a browser wrote, and the decoder has to accept them from
hand-authored input.

Everything else is UTF-8 encoded and escaped per byte.

## Decoding rules

Two failure modes are typed rather than silent:

- `PERCENT_DECODE_MALFORMED` - a `%` not followed by two hex digits, with the
  offending index in `details`.
- `PERCENT_DECODE_INVALID_UTF8` - a byte sequence that is not well-formed UTF-8:
  bad continuations, overlong encodings, UTF-16 surrogate halves, and values
  beyond U+10FFFF, with the byte index in `details`.

Raw (unescaped) non-ASCII characters are accepted as their own UTF-8 bytes
rather than rejected, because foreign encoders leave the raw set unescaped.

## Usage

```typescript
import { decodePercentUTF8, encodePercentUTF8 } from 'percent-codec-ts';

const encoded = encodePercentUTF8('café au lait'); // 'caf%C3%A9%20au%20lait'

const decoded = decodePercentUTF8(encoded);
if (decoded.success) {
  console.log(decoded.value);
} else {
  console.error(decoded.error.code, decoded.error.details);
}
```
