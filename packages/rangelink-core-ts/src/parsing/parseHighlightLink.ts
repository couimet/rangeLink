import { HIGHLIGHT_TEXT_DIRECTIVE } from '../constants/highlightLink';
import { MAX_LINK_LENGTH } from '../constants/MAX_LINK_LENGTH';
import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { CoreResult } from '../types/CoreResult';
import { ParsedTextLink } from '../types/ParsedTextLink';
import { TextDirective } from '../types/TextDirective';
import { decodePercentUTF8 } from '../utils/percentCodec';
import { quotePath } from '../utils/quotePath';

const FUNCTION_NAME = 'parseHighlightLink';

/**
 * Parse a text highlight link into its path and directive.
 *
 * Supported format: `<path>:~:text=[prefix-,]start[,end][,-suffix]`
 * where each term is percent-encoded UTF-8 and the terms are decoded here.
 *
 * The directive terms are split on the raw `,` before any decoding, then each
 * term is classified structurally and decoded, mirroring the order Chrome's
 * own text-fragment parser uses:
 * - a leading term ending in `-` is the `prefix`,
 * - a trailing term starting with `-` is the `suffix`,
 * - the remaining middle must be exactly one term (`start`) or two
 *   (`start,end`).
 * Empty terms (after decoding) and structural noise are rejected rather than
 * guessed at, so RangeLink never resolves a highlight it cannot name exactly.
 */
export const parseHighlightLink = (linkInput: string): CoreResult<ParsedTextLink> => {
  try {
    return CoreResult.ok(parseHighlightLinkOrThrow(linkInput));
  } catch (error) {
    if (error instanceof RangeLinkError) {
      return CoreResult.err(error);
    }
    throw error; // Re-throw unexpected errors
  }
};

const parseHighlightLinkOrThrow = (linkInput: string): ParsedTextLink => {
  // Strip surrounding quotes (single or double) so quoted links round-trip correctly
  const firstChar = linkInput[0];
  const lastChar = linkInput[linkInput.length - 1];
  const isQuoted = linkInput.length > 2 && ((firstChar === "'" && lastChar === "'") || (firstChar === '"' && lastChar === '"'));
  const link = isQuoted ? linkInput.slice(1, -1) : linkInput;

  if (link.length > MAX_LINK_LENGTH) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.PARSE_LINK_TOO_LONG,
      message: `Link exceeds maximum length of ${MAX_LINK_LENGTH} characters`,
      functionName: FUNCTION_NAME,
      details: { received: link.length, maximum: MAX_LINK_LENGTH },
    });
  }

  if (!link || link.trim() === '') {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.PARSE_EMPTY_LINK,
      message: 'Link cannot be empty',
      functionName: FUNCTION_NAME,
    });
  }

  // Reject web URLs - RangeLink should not hijack browser/terminal URL handling.
  // Exception: file:// URLs are allowed (they're valid local file references).
  if (link.includes('://') && !/^file:\/\//i.test(link)) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.PARSE_URL_NOT_SUPPORTED,
      message: 'Web URLs are not supported - use local file paths',
      functionName: FUNCTION_NAME,
      details: { link },
    });
  }

  const separatorIndex = link.indexOf(HIGHLIGHT_TEXT_DIRECTIVE);
  if (separatorIndex === -1) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.PARSE_TEXT_HIGHLIGHT_NO_SEPARATOR,
      message: `Link must contain ${HIGHLIGHT_TEXT_DIRECTIVE} separator`,
      functionName: FUNCTION_NAME,
    });
  }

  const path = link.slice(0, separatorIndex);
  if (path.trim() === '') {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.PARSE_EMPTY_PATH,
      message: 'Path cannot be empty',
      functionName: FUNCTION_NAME,
    });
  }

  const directiveValue = link.slice(separatorIndex + HIGHLIGHT_TEXT_DIRECTIVE.length);
  const directive = parseDirectiveValueOrThrow(directiveValue);

  return { path, quotedPath: quotePath(path), directive };
};

const parseDirectiveValueOrThrow = (directiveValue: string): TextDirective => {
  if (directiveValue.length === 0) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.PARSE_TEXT_HIGHLIGHT_EMPTY_VALUE,
      message: 'Text highlight directive cannot be empty',
      functionName: FUNCTION_NAME,
    });
  }

  const terms = directiveValue.split(',');

  // Structural classification: a trailing hyphen marks the term as prefix or
  // suffix only when other terms exist (a lone "foo-" is start text "foo-").
  const lastIndex = terms.length - 1;
  const hasPrefix = lastIndex >= 1 && terms[0].endsWith('-');
  const hasSuffix = lastIndex >= 1 && terms[lastIndex].startsWith('-');

  const firstMiddleIndex = hasPrefix ? 1 : 0;
  const lastMiddleIndex = hasSuffix ? lastIndex - 1 : lastIndex;
  const middleTerms = terms.slice(firstMiddleIndex, lastMiddleIndex + 1);

  if (middleTerms.length !== 1 && middleTerms.length !== 2) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.PARSE_TEXT_HIGHLIGHT_BAD_STRUCTURE,
      message: 'Invalid text directive structure - expected [prefix-,]start[,end][,-suffix]',
      functionName: FUNCTION_NAME,
      details: { termCount: middleTerms.length },
    });
  }

  const startRaw = middleTerms[0];
  const endRaw = middleTerms.length === 2 ? middleTerms[1] : undefined;
  const prefixRaw = hasPrefix ? terms[0].slice(0, -1) : undefined;
  const suffixRaw = hasSuffix ? terms[lastIndex].slice(1) : undefined;

  const requireNonEmpty = (termName: string, decoded: string): void => {
    if (decoded.length === 0) {
      throw new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_TEXT_HIGHLIGHT_EMPTY_TERM,
        message: 'Text directive term cannot be empty',
        functionName: FUNCTION_NAME,
        details: { term: termName },
      });
    }
  };

  const decodeTerm = (raw: string): string => {
    const decodedResult = decodePercentUTF8(raw);
    if (!decodedResult.success) {
      throw decodedResult.error;
    }
    return decodedResult.value;
  };

  const prefix = prefixRaw !== undefined ? decodeTerm(prefixRaw) : undefined;
  const start = decodeTerm(startRaw);
  const end = endRaw !== undefined ? decodeTerm(endRaw) : undefined;
  const suffix = suffixRaw !== undefined ? decodeTerm(suffixRaw) : undefined;

  if (prefix !== undefined) {
    requireNonEmpty('prefix', prefix);
  }
  requireNonEmpty('start', start);
  if (end !== undefined) {
    requireNonEmpty('end', end);
  }
  if (suffix !== undefined) {
    requireNonEmpty('suffix', suffix);
  }

  const directive: TextDirective = {
    start,
    ...(prefix !== undefined && { prefix }),
    ...(end !== undefined && { end }),
    ...(suffix !== undefined && { suffix }),
  };
  return directive;
};
