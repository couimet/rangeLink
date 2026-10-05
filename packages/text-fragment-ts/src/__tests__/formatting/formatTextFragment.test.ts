import { MAX_LINK_LENGTH } from '../../constants/maxLinkLength';
import { formatTextFragment } from '../../formatting/formatTextFragment';
import { parseTextFragment } from '../../parsing/parseTextFragment';

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

    it('should not re-encode a trailing start hyphen without a following term', () => {
      const result = formatTextFragment('src/file.ts', { start: 'foo-' });

      expect(result).toBeSuccess('src/file.ts:~:text=foo-');
    });

    it('should not re-encode a start hyphen when a prefix disambiguates', () => {
      const result = formatTextFragment('src/file.ts', { prefix: 'pre', start: 'foo-', end: 'bar' });

      expect(result).toBeSuccess('src/file.ts:~:text=pre-,foo-,bar');
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

    it('should leave an unsafe path unquoted', () => {
      const result = formatTextFragment('My Folder/file.ts', { start: 'foo' });

      expect(result).toBeSuccess('My Folder/file.ts:~:text=foo');
    });

    it('should keep interior hyphens literal in a prefix term', () => {
      const result = formatTextFragment('src/file.ts', { prefix: 'a-b', start: 'foo' });

      expect(result).toBeSuccess('src/file.ts:~:text=a-b-,foo');
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
