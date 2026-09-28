import { MAX_LINK_LENGTH } from '../../constants/maxLinkLength';
import { parseTextFragment } from '../../parsing/parseTextFragment';

import * as percentCodec from 'percent-codec-ts';

describe('parseTextFragment', () => {
  describe('valid links', () => {
    it('should parse a start-only directive', () => {
      const result = parseTextFragment('src/file.ts:~:text=function');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'function' },
      });
    });

    it('should parse a prefix and start', () => {
      const result = parseTextFragment('src/file.ts:~:text=const%20-,value');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { prefix: 'const ', start: 'value' },
      });
    });

    it('should parse a start and suffix', () => {
      const result = parseTextFragment('src/file.ts:~:text=value,-end');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'value', suffix: 'end' },
      });
    });

    it('should parse a start and end', () => {
      const result = parseTextFragment('src/file.ts:~:text=alpha,omega');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'alpha', end: 'omega' },
      });
    });

    it('should parse the full directive grammar', () => {
      const result = parseTextFragment('src/file.ts:~:text=before%20-,alpha,omega,-after');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { prefix: 'before ', start: 'alpha', end: 'omega', suffix: 'after' },
      });
    });

    it('should percent-decode multi-byte terms', () => {
      const result = parseTextFragment('src/file.ts:~:text=%C3%A9,%E4%B8%AD');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'é', end: '中' },
      });
    });

    it('should treat a lone trailing-hyphen term as start text', () => {
      const result = parseTextFragment('src/file.ts:~:text=foo-');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'foo-' },
      });
    });

    it('should treat a percent-encoded hyphen as literal start text', () => {
      const result = parseTextFragment('src/file.ts:~:text=foo%2D,bar');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'foo-', end: 'bar' },
      });
    });

    it('should keep interior hyphens as text inside prefix and start', () => {
      const result = parseTextFragment('src/file.ts:~:text=pre-fix-,start-tag');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { prefix: 'pre-fix', start: 'start-tag' },
      });
    });

    it('should return the raw unquoted path for a quoted link', () => {
      const result = parseTextFragment("'My Folder/file.ts:~:text=foo'");

      expect(result).toBeSuccess({
        path: 'My Folder/file.ts',
        directive: { start: 'foo' },
      });
    });

    it('should strip surrounding double quotes', () => {
      const result = parseTextFragment('"src/file.ts:~:text=foo"');

      expect(result).toBeSuccess({
        path: 'src/file.ts',
        directive: { start: 'foo' },
      });
    });

    it('should return a path containing a hash character unquoted', () => {
      const result = parseTextFragment('file#1.ts:~:text=foo');

      expect(result).toBeSuccess({
        path: 'file#1.ts',
        directive: { start: 'foo' },
      });
    });

    it('should allow a file:// path through the URL guard', () => {
      const result = parseTextFragment('file:///home/user/a.ts:~:text=foo');

      expect(result).toBeSuccess({
        path: 'file:///home/user/a.ts',
        directive: { start: 'foo' },
      });
    });
  });

  describe('error cases', () => {
    describe('PARSE_LINK_TOO_LONG', () => {
      it('should reject a link exceeding the maximum length', () => {
        const longLink = `${'a'.repeat(MAX_LINK_LENGTH + 1)}:~:text=foo`;
        const result = parseTextFragment(longLink);

        expect(result).toHaveDetailedError('PARSE_LINK_TOO_LONG', {
          message: `Link exceeds maximum length of ${MAX_LINK_LENGTH} characters`,
          functionName: 'parseTextFragment',
          details: { received: longLink.length, maximum: MAX_LINK_LENGTH },
        });
      });
    });

    describe('PARSE_EMPTY_LINK', () => {
      it('should reject an empty string', () => {
        const result = parseTextFragment('');

        expect(result).toHaveDetailedError('PARSE_EMPTY_LINK', {
          message: 'Link cannot be empty',
          functionName: 'parseTextFragment',
        });
      });

      it('should reject a whitespace-only string', () => {
        const result = parseTextFragment('   ');

        expect(result).toHaveDetailedError('PARSE_EMPTY_LINK', {
          message: 'Link cannot be empty',
          functionName: 'parseTextFragment',
        });
      });
    });

    describe('PARSE_URL_NOT_SUPPORTED', () => {
      it('should reject a web URL', () => {
        const result = parseTextFragment('https://example.com/a.ts:~:text=foo');

        expect(result).toHaveDetailedError('PARSE_URL_NOT_SUPPORTED', {
          message: 'Web URLs are not supported - use local file paths',
          functionName: 'parseTextFragment',
          details: { link: 'https://example.com/a.ts:~:text=foo' },
        });
      });
    });

    describe('PARSE_TEXT_FRAGMENT_NO_SEPARATOR', () => {
      it('should reject a link without the :~:text= marker', () => {
        const result = parseTextFragment('src/file.ts#L10');

        expect(result).toHaveDetailedError('PARSE_TEXT_FRAGMENT_NO_SEPARATOR', {
          message: 'Link must contain :~:text= separator',
          functionName: 'parseTextFragment',
        });
      });
    });

    describe('PARSE_EMPTY_PATH', () => {
      it('should reject a link whose path is empty', () => {
        const result = parseTextFragment(':~:text=foo');

        expect(result).toHaveDetailedError('PARSE_EMPTY_PATH', {
          message: 'Path cannot be empty',
          functionName: 'parseTextFragment',
        });
      });
    });

    describe('PARSE_TEXT_FRAGMENT_EMPTY_VALUE', () => {
      it('should reject an empty directive value', () => {
        const result = parseTextFragment('src/file.ts:~:text=');

        expect(result).toHaveDetailedError('PARSE_TEXT_FRAGMENT_EMPTY_VALUE', {
          message: 'Text fragment directive cannot be empty',
          functionName: 'parseTextFragment',
        });
      });
    });

    describe('PARSE_TEXT_FRAGMENT_BAD_STRUCTURE', () => {
      it('should reject more than one interior term', () => {
        const result = parseTextFragment('src/file.ts:~:text=one,two,three');

        expect(result).toHaveDetailedError('PARSE_TEXT_FRAGMENT_BAD_STRUCTURE', {
          message: 'Invalid text directive structure - expected [prefix-,]start[,end][,-suffix]',
          functionName: 'parseTextFragment',
          details: { termCount: 3 },
        });
      });

      it('should reject an empty interior when prefix and suffix collide', () => {
        const result = parseTextFragment('src/file.ts:~:text=a-,-b');

        expect(result).toHaveDetailedError('PARSE_TEXT_FRAGMENT_BAD_STRUCTURE', {
          message: 'Invalid text directive structure - expected [prefix-,]start[,end][,-suffix]',
          functionName: 'parseTextFragment',
          details: { termCount: 0 },
        });
      });
    });

    describe('PARSE_TEXT_FRAGMENT_EMPTY_TERM', () => {
      it('should reject an empty prefix', () => {
        const result = parseTextFragment('src/file.ts:~:text=-,foo');

        expect(result).toHaveDetailedError('PARSE_TEXT_FRAGMENT_EMPTY_TERM', {
          message: 'Text directive term cannot be empty',
          functionName: 'parseTextFragment',
          details: { term: 'prefix' },
        });
      });

      it('should reject an empty start', () => {
        const result = parseTextFragment('src/file.ts:~:text=prefix-,');

        expect(result).toHaveDetailedError('PARSE_TEXT_FRAGMENT_EMPTY_TERM', {
          message: 'Text directive term cannot be empty',
          functionName: 'parseTextFragment',
          details: { term: 'start' },
        });
      });

      it('should reject an empty end', () => {
        const result = parseTextFragment('src/file.ts:~:text=foo,');

        expect(result).toHaveDetailedError('PARSE_TEXT_FRAGMENT_EMPTY_TERM', {
          message: 'Text directive term cannot be empty',
          functionName: 'parseTextFragment',
          details: { term: 'end' },
        });
      });

      it('should reject an empty suffix', () => {
        const result = parseTextFragment('src/file.ts:~:text=foo,-');

        expect(result).toHaveDetailedError('PARSE_TEXT_FRAGMENT_EMPTY_TERM', {
          message: 'Text directive term cannot be empty',
          functionName: 'parseTextFragment',
          details: { term: 'suffix' },
        });
      });
    });

    describe('delegated codec errors', () => {
      it('should surface a malformed percent-escape from the codec', () => {
        const result = parseTextFragment('src/file.ts:~:text=%ZZ');

        expect(result).toHaveDetailedError('PERCENT_DECODE_MALFORMED', {
          message: "Malformed percent-encoding at index 0: '%' must be followed by two hex digits",
          functionName: 'decodePercentUTF8',
          details: { index: 0 },
        });
      });

      it('should surface invalid UTF-8 from the codec', () => {
        const result = parseTextFragment('src/file.ts:~:text=%C0%AF');

        expect(result).toHaveDetailedError('PERCENT_DECODE_INVALID_UTF8', {
          message: 'Invalid UTF-8 byte sequence',
          functionName: 'decodePercentUTF8',
          details: { byteIndex: 0 },
        });
      });
    });

    describe('unexpected internal errors', () => {
      it('should re-throw non-codec errors', () => {
        const spy = jest.spyOn(percentCodec, 'decodePercentUTF8').mockImplementationOnce(() => {
          throw new Error('boom');
        });

        expect(() => parseTextFragment('src/file.ts:~:text=foo')).toThrow('boom');
        expect(spy).toHaveBeenCalledWith('foo');
      });
    });
  });
});
