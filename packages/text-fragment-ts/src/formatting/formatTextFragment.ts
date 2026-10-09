import { MAX_LINK_LENGTH } from '../constants/maxLinkLength';
import { TEXT_FRAGMENT_DIRECTIVE } from '../constants/textFragment';
import { TextFragmentError } from '../errors/TextFragmentError';
import { TextFragmentErrorCodes } from '../errors/TextFragmentErrorCodes';
import { TextDirective } from '../types/TextDirective';
import { TextFragmentResult } from '../types/TextFragmentResult';

import { encodePercentUTF8 } from 'percent-codec-ts';

/** The escape a literal edge hyphen takes, so a reader keeps it as text. */
const ESCAPED_HYPHEN = '%2D';

/**
 * Percent-encode one term, with any hyphen at either edge escaped.
 *
 * A reader takes the first term as a `prefix` when it ends with `-` and the
 * last term as a `suffix` when it starts with `-`. An edge hyphen that is text
 * and not a marker must therefore be escaped, or the link reads back as a
 * different directive than the one it was built from. Both edges of both
 * middle terms are escaped on every call, which makes the rule total: no term
 * shape needs a condition of its own to stay readable.
 */
const encodeTerm = (term: string): string => {
  let encoded = encodePercentUTF8(term);
  if (encoded.startsWith('-')) {
    encoded = `${ESCAPED_HYPHEN}${encoded.slice(1)}`;
  }
  if (encoded.endsWith('-')) {
    encoded = `${encoded.slice(0, -1)}${ESCAPED_HYPHEN}`;
  }
  return encoded;
};

/**
 * Build a text fragment link string from a path and a decoded directive.
 *
 * Terms are percent-encoded (`encodePercentUTF8`) and joined with `,` in
 * grammar order: `[prefix-,]start[,end][,-suffix]`, then appended to the path
 * with the `:~:text=` marker.
 *
 * The output is raw (unquoted): the path is taken as given and no quoting is
 * applied, because outbound quoting policy belongs to the caller's layer. The
 * result is always the whole link, path included, so a caller that needs a
 * quoted link wraps the return value.
 *
 * The marker hyphens on the `prefix` and on the `suffix` are written here and
 * never escape, because the reader strips them by position. See `encodeTerm`
 * for the hyphen that belongs to the text.
 */
export const formatTextFragment = (path: string, directive: TextDirective): TextFragmentResult<string> => {
  const parts: string[] = [];
  if (directive.prefix !== undefined) {
    parts.push(`${encodePercentUTF8(directive.prefix)}-`);
  }
  parts.push(encodeTerm(directive.start));
  if (directive.end !== undefined) {
    parts.push(encodeTerm(directive.end));
  }
  if (directive.suffix !== undefined) {
    parts.push(`-${encodePercentUTF8(directive.suffix)}`);
  }

  const rawLink = `${path}${TEXT_FRAGMENT_DIRECTIVE}${parts.join(',')}`;

  if (rawLink.length > MAX_LINK_LENGTH) {
    return TextFragmentResult.err(
      new TextFragmentError({
        code: TextFragmentErrorCodes.PARSE_LINK_TOO_LONG,
        message: `Link exceeds maximum length of ${MAX_LINK_LENGTH} characters`,
        functionName: 'formatTextFragment',
        details: { received: rawLink.length, maximum: MAX_LINK_LENGTH },
      }),
    );
  }

  return TextFragmentResult.ok(rawLink);
};
