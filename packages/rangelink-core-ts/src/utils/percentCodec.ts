import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { CoreResult } from '../types/CoreResult';

// Octets percent-encoding leaves untouched. Mirrors the raw set kept by
// `encodeURIComponent` (unreserved marks plus `!~*'()`), not the text-fragment
// draft's stricter `[A-Za-z0-9]`. Chrome emits those bytes unescaped, so our
// encoder must too or links we write stop detecting links Chrome wrote, and
// the decoder must accept them from hand- or foreign-authored directives.
const isEncodeSafeAscii = (code: number): boolean => {
  return (
    (code >= 0x41 && code <= 0x5a) || // A-Z
    (code >= 0x61 && code <= 0x7a) || // a-z
    (code >= 0x30 && code <= 0x39) || // 0-9
    code === 0x2d || // -
    code === 0x5f || // _
    code === 0x2e || // .
    code === 0x21 || // !
    code === 0x7e || // ~
    code === 0x2a || // *
    code === 0x27 || // '
    code === 0x28 || // (
    code === 0x29 // )
  );
};

const HEX = '0123456789ABCDEF';

/**
 * Encode a UTF-8 string as percent-encoded octets.
 *
 * ASCII characters in the raw set pass through unescaped (matching
 * `encodeURIComponent`); everything else is UTF-8 encoded then percent-escaped
 * with uppercase hex, one `%XX` per byte.
 */
export const encodePercentUTF8 = (text: string): string => {
  let encoded = '';
  for (const char of text) {
    const codePoint = char.codePointAt(0)!;
    if (codePoint < 0x80 && isEncodeSafeAscii(codePoint)) {
      encoded += char;
      continue;
    }
    const bytes = toUtf8Bytes(codePoint);
    for (const byte of bytes) {
      encoded += `%${HEX[byte >> 4]}${HEX[byte & 0x0f]}`;
    }
  }
  return encoded;
};

const toUtf8Bytes = (codePoint: number): number[] => {
  if (codePoint <= 0x7f) {
    return [codePoint];
  }
  if (codePoint <= 0x7ff) {
    return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
  }
  if (codePoint <= 0xffff) {
    return [0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f)];
  }
  return [0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f)];
};

/**
 * Decode a percent-encoded UTF-8 string back to text.
 *
 * Accepts the raw octets kept by the encoder (see `encodePercentUTF8`) and
 * rejects malformed escapes (`%` not followed by two hex digits) and byte
 * sequences that are not well-formed UTF-8 (bad continuations, overlong
 * encodings, surrogate code points, out-of-range 4-byte values).
 */
export const decodePercentUTF8 = (encoded: string): CoreResult<string> => {
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    if (char === '%') {
      const hiChar = encoded[i + 1];
      const loChar = encoded[i + 2];
      const hi = hiChar === undefined ? -1 : HEX.indexOf(hiChar.toUpperCase());
      const lo = loChar === undefined ? -1 : HEX.indexOf(loChar.toUpperCase());
      if (hi === -1 || lo === -1) {
        return CoreResult.err(
          new RangeLinkError({
            code: RangeLinkErrorCodes.TEXT_HIGHLIGHT_PERCENT_DECODE_MALFORMED,
            message: `Malformed percent-encoding at index ${i}: '%' must be followed by two hex digits`,
            functionName: 'decodePercentUTF8',
            details: { index: i },
          }),
        );
      }
      bytes.push((hi << 4) | lo);
      i += 2;
      continue;
    }
    // Raw octet: foreign encoders keep the raw set unescaped, so treat any
    // literal character as its own UTF-8 bytes rather than an error.
    const codePoint = char.codePointAt(0)!;
    for (const byte of toUtf8Bytes(codePoint)) {
      bytes.push(byte);
    }
  }
  return decodeUtf8Bytes(bytes);
};

const decodeUtf8Bytes = (bytes: number[]): CoreResult<string> => {
  const invalid = (byteIndex: number): CoreResult<string> =>
    CoreResult.err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.TEXT_HIGHLIGHT_PERCENT_DECODE_INVALID_UTF8,
        message: 'Invalid UTF-8 byte sequence',
        functionName: 'decodePercentUTF8',
        details: { byteIndex },
      }),
    );

  const isContinuation = (byte: number): boolean => (byte & 0xc0) === 0x80;

  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const first = bytes[i];
    if (first < 0x80) {
      out += String.fromCharCode(first);
      i += 1;
      continue;
    }

    let codePoint: number;
    let width: number;
    if ((first & 0xe0) === 0xc0) {
      codePoint = first & 0x1f;
      width = 2;
    } else if ((first & 0xf0) === 0xe0) {
      codePoint = first & 0x0f;
      width = 3;
    } else if ((first & 0xf8) === 0xf0) {
      codePoint = first & 0x07;
      width = 4;
    } else {
      return invalid(i);
    }

    if (i + width > bytes.length) {
      return invalid(i);
    }
    for (let k = 1; k < width; k++) {
      const continuation = bytes[i + k];
      if (!isContinuation(continuation)) {
        return invalid(i + k);
      }
      codePoint = (codePoint << 6) | (continuation & 0x3f);
    }

    if (!isValidCodePoint(codePoint, width)) {
      return invalid(i);
    }
    out += String.fromCodePoint(codePoint);
    i += width;
  }
  return CoreResult.ok(out);
};

// Rejects overlong encodings (a code point squeezed into more bytes than it
// needs), UTF-16 surrogate halves, and values beyond U+10FFFF.
const isValidCodePoint = (codePoint: number, width: number): boolean => {
  if (width === 2) {
    return codePoint >= 0x80;
  }
  if (width === 3) {
    return codePoint >= 0x800 && (codePoint < 0xd800 || codePoint > 0xdfff);
  }
  return codePoint >= 0x10000 && codePoint <= 0x10ffff;
};
