import { MAX_LINK_LENGTH } from '../../constants/maxLinkLength';
import { formatTextFragment } from '../../formatting/formatTextFragment';
import { parseTextFragment } from '../../parsing/parseTextFragment';
import { TextDirective } from '../../types';

// A directive read back compares by value, not by property order, so the
// comparison flattens the four terms into a fixed-order array.
const canonicalDirective = (directive: TextDirective): string => JSON.stringify([directive.start, directive.prefix, directive.end, directive.suffix]);

const roundTripOffender = (directive: TextDirective): string | undefined => {
  const link = formatTextFragment('src/file.ts', directive);
  if (!link.success) {
    return `${JSON.stringify(directive)} -> format failed with ${link.error.code}`;
  }
  const parsed = parseTextFragment(link.value);
  if (!parsed.success) {
    return `${JSON.stringify(directive)} -> ${link.value} -> parse failed with ${parsed.error.code}`;
  }
  if (canonicalDirective(parsed.value.directive) === canonicalDirective(directive)) {
    return undefined;
  }
  return `${JSON.stringify(directive)} -> ${link.value} -> ${JSON.stringify(parsed.value.directive)}`;
};

describe('formatTextFragment', () => {
  describe('valid output', () => {
    it('should format a start-only directive', () => {
      const result = formatTextFragment('src/file.ts', { start: 'function' });

      expect(result).toBeSuccess('src/file.ts:~:text=function');
    });

    it('should percent-encode spaces and non-ASCII text', () => {
      const result = formatTextFragment('src/file.ts', { start: 'foo bar é' });

      expect(result).toBeSuccess('src/file.ts:~:text=foo%20bar%20%C3%A9');
    });

    it('should order prefix, start, end, suffix with grammar markers', () => {
      const result = formatTextFragment('src/file.ts', { prefix: 'export ', start: 'alpha', end: 'omega', suffix: 'end' });

      expect(result).toBeSuccess('src/file.ts:~:text=export%20-,alpha,omega,-end');
    });

    it('should re-encode a trailing start hyphen when a term follows', () => {
      const result = formatTextFragment('src/file.ts', { start: 'foo-', end: 'bar' });

      expect(result).toBeSuccess('src/file.ts:~:text=foo%2D,bar');
    });

    it('should re-encode a trailing start hyphen before a suffix', () => {
      const result = formatTextFragment('src/file.ts', { start: 'foo-', suffix: 'ctx' });

      expect(result).toBeSuccess('src/file.ts:~:text=foo%2D,-ctx');
    });

    it('should re-encode a trailing start hyphen without a following term', () => {
      const result = formatTextFragment('src/file.ts', { start: 'foo-' });

      expect(result).toBeSuccess('src/file.ts:~:text=foo%2D');
    });

    it('should re-encode a trailing start hyphen after a prefix', () => {
      const result = formatTextFragment('src/file.ts', { prefix: 'pre', start: 'foo-', end: 'bar' });

      expect(result).toBeSuccess('src/file.ts:~:text=pre-,foo%2D,bar');
    });

    it('should re-encode a leading start hyphen after a prefix', () => {
      const result = formatTextFragment('src/file.ts', { prefix: 'pre', start: '-foo' });

      expect(result).toBeSuccess('src/file.ts:~:text=pre-,%2Dfoo');
    });

    it('should re-encode a leading end hyphen without a suffix', () => {
      const result = formatTextFragment('src/file.ts', { start: 'foo', end: '-bar' });

      expect(result).toBeSuccess('src/file.ts:~:text=foo,%2Dbar');
    });

    it('should keep interior hyphens literal in a start and in an end term', () => {
      const result = formatTextFragment('src/file.ts', { start: 'a-b', end: 'c-d' });

      expect(result).toBeSuccess('src/file.ts:~:text=a-b,c-d');
    });

    it('should round-trip a term boundary through parse', () => {
      const link = formatTextFragment('src/file.ts', { start: 'foo-', end: 'bar' });

      expect(link).toBeSuccess('src/file.ts:~:text=foo%2D,bar');
      const parsed = parseTextFragment('src/file.ts:~:text=foo%2D,bar');
      expect(parsed).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'foo-', end: 'bar' },
      });
    });

    it('should round-trip a leading end hyphen through parse', () => {
      const link = formatTextFragment('src/file.ts', { start: 'foo', end: '-bar' });

      expect(link).toBeSuccess('src/file.ts:~:text=foo,%2Dbar');
      const parsed = parseTextFragment('src/file.ts:~:text=foo,%2Dbar');
      expect(parsed).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'foo', end: '-bar' },
      });
    });

    it('should leave an unsafe path unquoted', () => {
      const result = formatTextFragment('My Folder/file.ts', { start: 'foo' });

      expect(result).toBeSuccess('My Folder/file.ts:~:text=foo');
    });

    it('should keep interior hyphens literal in a prefix term', () => {
      const result = formatTextFragment('src/file.ts', { prefix: 'a-b', start: 'foo' });

      expect(result).toBeSuccess('src/file.ts:~:text=a-b-,foo');
    });

    it('should round-trip every boundary-hyphen shape', () => {
      const prefixValues = [undefined, 'p', 'p-'];
      const startValues = ['s', '-s', 's-'];
      const endValues = [undefined, 'e', '-e', 'e-'];
      const suffixValues = [undefined, 'x', '-x'];
      const shapes: TextDirective[] = prefixValues.flatMap((prefix) =>
        startValues.flatMap((start) =>
          endValues.flatMap((end) =>
            suffixValues.map((suffix) => ({
              start,
              ...(prefix !== undefined && { prefix }),
              ...(end !== undefined && { end }),
              ...(suffix !== undefined && { suffix }),
            })),
          ),
        ),
      );

      expect(shapes).toHaveLength(prefixValues.length * startValues.length * endValues.length * suffixValues.length);
      const offenders = shapes.map(roundTripOffender).filter((offender) => offender !== undefined);
      expect(offenders).toStrictEqual([]);
    });
  });

  describe('error cases', () => {
    describe('PARSE_LINK_TOO_LONG', () => {
      it('should reject output exceeding the maximum length', () => {
        const path = 'a'.repeat(MAX_LINK_LENGTH);
        const result = formatTextFragment(path, { start: 'foo' });

        const suffix = ':~:text=foo';
        expect(result).toHaveDetailedError('PARSE_LINK_TOO_LONG', {
          message: `Link exceeds maximum length of ${MAX_LINK_LENGTH} characters`,
          functionName: 'formatTextFragment',
          details: { received: MAX_LINK_LENGTH + suffix.length, maximum: MAX_LINK_LENGTH },
        });
      });
    });
  });
});
