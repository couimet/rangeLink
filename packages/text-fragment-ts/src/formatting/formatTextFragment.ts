import { MAX_LINK_LENGTH } from '../constants/maxLinkLength';
import { TEXT_FRAGMENT_DIRECTIVE } from '../constants/textFragment';
import { TextFragmentError } from '../errors/TextFragmentError';
import { TextFragmentErrorCodes } from '../errors/TextFragmentErrorCodes';
import { TextDirective } from '../types/TextDirective';
import { TextFragmentResult } from '../types/TextFragmentResult';

import { encodePercentUTF8 } from 'percent-codec-ts';

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
 * A trailing `-` inside the `start` term is re-encoded as `%2D` when no prefix
 * disambiguates it and a further term follows, otherwise a reader would
 * classify that term as a prefix. This is the one spot where the grammar's
 * term-boundary hyphen collides with real text content.
 */
export const formatTextFragment = (path: string, directive: TextDirective): TextFragmentResult<string> => {
  const encodeTerm = (term: string): string => encodePercentUTF8(term);

  const startTerm = encodeTerm(directive.start);
  const hasFollowingTerm = directive.end !== undefined || directive.suffix !== undefined;
  const disambiguatedStart = directive.prefix === undefined && hasFollowingTerm && startTerm.endsWith('-') ? `${startTerm.slice(0, -1)}%2D` : startTerm;

  const parts: string[] = [];
  if (directive.prefix !== undefined) {
    parts.push(`${encodeTerm(directive.prefix)}-`);
  }
  parts.push(disambiguatedStart);
  if (directive.end !== undefined) {
    parts.push(encodeTerm(directive.end));
  }
  if (directive.suffix !== undefined) {
    parts.push(`-${encodeTerm(directive.suffix)}`);
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
