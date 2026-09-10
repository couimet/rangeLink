import { HIGHLIGHT_TEXT_DIRECTIVE } from '../constants/highlightLink';
import { MAX_LINK_LENGTH } from '../constants/MAX_LINK_LENGTH';
import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { CoreResult } from '../types/CoreResult';
import { TextDirective } from '../types/TextDirective';
import { encodePercentUTF8 } from '../utils/percentCodec';
import { quoteLink } from '../utils/quoteLink';

/**
 * Build a text highlight link string from a path and a decoded directive.
 *
 * Terms are percent-encoded (`encodePercentUTF8`) and joined with `,` in
 * grammar order: `[prefix-,]start[,end][,-suffix]`, then appended to the path
 * with the `:~:text=` marker.
 *
 * A trailing `-` inside the `start` term is re-encoded as `%2D` when no prefix
 * disambiguates it and a further term follows, otherwise a reader would
 * classify that term as a prefix. This is the one spot where the grammar's
 * term-boundary hyphen collides with real text content.
 */
export const formatHighlightLink = (path: string, directive: TextDirective): CoreResult<string> => {
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

  const rawLink = `${path}${HIGHLIGHT_TEXT_DIRECTIVE}${parts.join(',')}`;

  if (rawLink.length > MAX_LINK_LENGTH) {
    return CoreResult.err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_LINK_TOO_LONG,
        message: `Link exceeds maximum length of ${MAX_LINK_LENGTH} characters`,
        functionName: 'formatHighlightLink',
        details: { received: rawLink.length, maximum: MAX_LINK_LENGTH },
      }),
    );
  }

  return CoreResult.ok(quoteLink(rawLink, path));
};
