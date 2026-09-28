import { findOccurrences, normalizeEOL, resolveTextFragmentMatch } from '../../matching/textMatch';

describe('findOccurrences', () => {
  it('should return every distinct start index, overlapping included', () => {
    expect(findOccurrences('aaaa', 'aa')).toStrictEqual([0, 1, 2]);
  });

  it('should return empty when the needle is absent', () => {
    expect(findOccurrences('hello world', 'zzz')).toStrictEqual([]);
  });

  it('should return empty for an empty needle', () => {
    expect(findOccurrences('hello', '')).toStrictEqual([]);
  });
});

describe('normalizeEOL', () => {
  it('should collapse CRLF pairs to LF', () => {
    expect(normalizeEOL('a\r\nb\r\nc')).toBe('a\nb\nc');
  });

  it('should leave LF-only and lone CR text unchanged', () => {
    expect(normalizeEOL('a\nb\rc')).toBe('a\nb\rc');
  });

  it('should leave text without line endings unchanged', () => {
    expect(normalizeEOL('single line')).toBe('single line');
  });
});

describe('resolveTextFragmentMatch', () => {
  describe('start-only directives', () => {
    it('should resolve a single unique match to raw offsets', () => {
      const result = resolveTextFragmentMatch('foo bar baz', { start: 'bar' });

      expect(result).toStrictEqual({ status: 'matched', start: 4, end: 7 });
    });

    it('should report ambiguity for multiple matches', () => {
      const result = resolveTextFragmentMatch('foo foo', { start: 'foo' });

      expect(result).toStrictEqual({ status: 'ambiguous', count: 2 });
    });

    it('should report not-found when the start term is absent', () => {
      const result = resolveTextFragmentMatch('no text here', { start: 'missing' });

      expect(result).toStrictEqual({ status: 'not-found' });
    });

    it('should match case-sensitively', () => {
      const result = resolveTextFragmentMatch('foo Foo', { start: 'Foo' });

      expect(result).toStrictEqual({ status: 'matched', start: 4, end: 7 });
    });
  });

  describe('prefix adjacency', () => {
    it('should resolve when the prefix directly precedes the start term', () => {
      const result = resolveTextFragmentMatch('const value', { prefix: 'const ', start: 'value' });

      expect(result).toStrictEqual({ status: 'matched', start: 6, end: 11 });
    });

    it('should not resolve when the start term begins before the prefix length', () => {
      const result = resolveTextFragmentMatch('foo', { prefix: 'x', start: 'foo' });

      expect(result).toStrictEqual({ status: 'not-found' });
    });

    it('should not resolve when the prefix is not immediately adjacent', () => {
      const result = resolveTextFragmentMatch('const x foo', { prefix: 'const ', start: 'foo' });

      expect(result).toStrictEqual({ status: 'not-found' });
    });
  });

  describe('suffix adjacency without end', () => {
    it('should resolve when the suffix directly follows the start term', () => {
      const result = resolveTextFragmentMatch('fooX', { start: 'foo', suffix: 'X' });

      expect(result).toStrictEqual({ status: 'matched', start: 0, end: 3 });
    });

    it('should not resolve when the suffix text does not follow', () => {
      const result = resolveTextFragmentMatch('fooY', { start: 'foo', suffix: 'X' });

      expect(result).toStrictEqual({ status: 'not-found' });
    });

    it('should not resolve when the suffix would run past the document end', () => {
      const result = resolveTextFragmentMatch('foo', { start: 'foo', suffix: 'XX' });

      expect(result).toStrictEqual({ status: 'not-found' });
    });
  });

  describe('start,end ranges', () => {
    it('should resolve a range spanning to the end term', () => {
      const text = 'start middle end';
      const result = resolveTextFragmentMatch(text, { start: 'start', end: 'end' });

      expect(result).toStrictEqual({ status: 'matched', start: 0, end: text.length });
    });

    it('should report ambiguity when several end occurrences qualify', () => {
      const result = resolveTextFragmentMatch('a b b', { start: 'a', end: 'b' });

      expect(result).toStrictEqual({ status: 'ambiguous', count: 2 });
    });

    it('should not resolve when the end term occurs before the start term ends', () => {
      const result = resolveTextFragmentMatch('end start', { start: 'start', end: 'end' });

      expect(result).toStrictEqual({ status: 'not-found' });
    });

    it('should not resolve when the end term is absent', () => {
      const result = resolveTextFragmentMatch('just start', { start: 'start', end: 'zzz' });

      expect(result).toStrictEqual({ status: 'not-found' });
    });

    it('should resolve with a suffix directly after the end term', () => {
      const result = resolveTextFragmentMatch('start endX', { start: 'start', end: 'end', suffix: 'X' });

      expect(result).toStrictEqual({ status: 'matched', start: 0, end: 9 });
    });

    it('should drop end occurrences that lack the required suffix adjacency', () => {
      const result = resolveTextFragmentMatch('a bX', { start: 'a', end: 'b', suffix: 'X' });

      expect(result).toStrictEqual({ status: 'matched', start: 0, end: 3 });
    });

    it('should not resolve when no end occurrence has the required suffix', () => {
      const result = resolveTextFragmentMatch('a b', { start: 'a', end: 'b', suffix: 'X' });

      expect(result).toStrictEqual({ status: 'not-found' });
    });
  });

  describe('CRLF documents', () => {
    it('should remap a match on a later line to raw offsets', () => {
      const result = resolveTextFragmentMatch('ab\r\ncd', { start: 'cd' });

      expect(result).toStrictEqual({ status: 'matched', start: 4, end: 6 });
    });

    it('should keep an end boundary at a line ending before the CR', () => {
      const result = resolveTextFragmentMatch('ab\r\ncd', { start: 'ab' });

      expect(result).toStrictEqual({ status: 'matched', start: 0, end: 2 });
    });

    it('should include the full CRLF when the match spans the newline', () => {
      const result = resolveTextFragmentMatch('ab\r\ncd', { start: 'b\nc' });

      expect(result).toStrictEqual({ status: 'matched', start: 1, end: 5 });
    });

    it('should remap across multiple CRLF line endings', () => {
      const result = resolveTextFragmentMatch('x\r\ny\r\nz', { start: 'y' });

      expect(result).toStrictEqual({ status: 'matched', start: 3, end: 4 });
    });

    it('should not translate offsets when the document is LF-only', () => {
      const result = resolveTextFragmentMatch('ab\ncd', { start: 'cd' });

      expect(result).toStrictEqual({ status: 'matched', start: 3, end: 5 });
    });
  });
});
