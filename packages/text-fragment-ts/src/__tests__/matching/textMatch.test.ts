import { DEFAULT_MAX_CANDIDATES } from '../../constants/textMatch';
import { findOccurrences, normalizeDocument, resolveTextFragmentMatch } from '../../matching';

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

  it('should compare without regard to case by default', () => {
    expect(findOccurrences('aAa', 'a')).toStrictEqual([0, 1, 2]);
  });

  it('should compare exactly when case sensitivity is requested', () => {
    expect(findOccurrences('aAa', 'a', 'sensitive')).toStrictEqual([0, 2]);
  });

  it('should return the upper-case occurrence alone when case sensitivity is requested', () => {
    expect(findOccurrences('aAa', 'A', 'sensitive')).toStrictEqual([1]);
  });
});

describe('normalizeDocument', () => {
  it('should read a CRLF pair as one space and map both edges to raw offsets', () => {
    const document = normalizeDocument('ab\r\ncd', true);

    expect({ text: document.text, start: document.toRawOffset(3), end: document.toRawOffset(5) }).toStrictEqual({
      text: 'ab cd',
      start: 4,
      end: 6,
    });
  });

  it('should keep the raw offsets of text before a collapsed run', () => {
    const document = normalizeDocument('a  b', true);

    expect({ text: document.text, offsetOfB: document.toRawOffset(2) }).toStrictEqual({ text: 'a b', offsetOfB: 3 });
  });

  it('should leave line endings and whitespace alone when collapsing is off', () => {
    const document = normalizeDocument('a\r\n\r\nb', false);

    expect(document.text).toBe('a\n\nb');
  });

  it('should find the normalized index that a raw offset lands on', () => {
    const document = normalizeDocument('ab\r\ncd', true);

    expect(document.toNormalizedOffset(4)).toBe(3);
  });

  it('should let a match span a line break and still cover the whole CRLF pair', () => {
    const document = normalizeDocument('foo\r\nbar', true);

    expect({ text: document.text, end: document.toRawOffset(7) }).toStrictEqual({ text: 'foo bar', end: 8 });
  });
});

describe('resolveTextFragmentMatch', () => {
  describe('start-only directives', () => {
    it('should return every place the start term matches, in raw offsets', () => {
      const result = resolveTextFragmentMatch('foo foo', { start: 'foo' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([
          { start: 0, end: 3 },
          { start: 4, end: 7 },
        ]);
      });
    });

    it('should return an empty list when the start term is absent', () => {
      const result = resolveTextFragmentMatch('no text here', { start: 'missing' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should return the single place the start term matches', () => {
      const result = resolveTextFragmentMatch('foo bar baz', { start: 'bar' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 4, end: 7 }]);
      });
    });
  });

  describe('case', () => {
    it('should match without regard to case by default', () => {
      const result = resolveTextFragmentMatch('Foo foo', { start: 'foo' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([
          { start: 0, end: 3 },
          { start: 4, end: 7 },
        ]);
      });
    });

    it('should return only the exactly-cased place when case sensitivity is requested', () => {
      const result = resolveTextFragmentMatch('Foo foo', { start: 'foo' }, { caseSensitivity: 'sensitive' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 4, end: 7 }]);
      });
    });
  });

  describe('word boundaries', () => {
    it('should refuse a start term that begins inside a word', () => {
      const result = resolveTextFragmentMatch('brown fox', { start: 'ro' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should refuse a start term that ends inside a word', () => {
      const result = resolveTextFragmentMatch('brown fox', { start: 'bro' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should accept a start term that begins and ends on word boundaries', () => {
      const result = resolveTextFragmentMatch('brown fox', { start: 'brown' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 5 }]);
      });
    });

    it('should refuse a prefix that begins inside a word', () => {
      const result = resolveTextFragmentMatch('jumped', { prefix: 'u', start: 'mped' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should accept a prefix that begins on a word boundary', () => {
      const result = resolveTextFragmentMatch('jumped', { prefix: 'ju', start: 'mped' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 2, end: 6 }]);
      });
    });

    it('should let a prefix carry the word-start rule in place of the start term', () => {
      const result = resolveTextFragmentMatch('brown fox', { prefix: 'br', start: 'own' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 2, end: 5 }]);
      });
    });

    it('should refuse a suffix that ends inside a word', () => {
      const result = resolveTextFragmentMatch('quick brown', { start: 'quick', suffix: 'bro' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should let a suffix relax the start term end boundary', () => {
      const result = resolveTextFragmentMatch('quick brown', { start: 'bro', suffix: 'wn' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 6, end: 9 }]);
      });
    });

    it('should refuse the same start term when no suffix follows it', () => {
      const result = resolveTextFragmentMatch('quick brown', { start: 'bro' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should refuse an end term that begins inside a word', () => {
      const result = resolveTextFragmentMatch('c. cand', { start: 'c.', end: 'and' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should accept an end term that begins on a word boundary', () => {
      const result = resolveTextFragmentMatch('c. and', { start: 'c.', end: 'and' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 6 }]);
      });
    });

    it('should refuse an end term that ends inside a word', () => {
      const result = resolveTextFragmentMatch('ab andand ab', { start: 'ab', end: 'and' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should accept an end term that ends on a word boundary', () => {
      const result = resolveTextFragmentMatch('ab andX ab', { start: 'ab', end: 'andX' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 7 }]);
      });
    });

    it('should let a suffix relax the end term end boundary', () => {
      const result = resolveTextFragmentMatch('ab andX ab', { start: 'ab', end: 'and', suffix: 'X' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 6 }]);
      });
    });

    it('should refuse the same end term when no suffix follows it', () => {
      const result = resolveTextFragmentMatch('ab andX ab', { start: 'ab', end: 'and' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should treat punctuation as a word boundary', () => {
      const result = resolveTextFragmentMatch('the fox.', { start: 'fox' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 4, end: 7 }]);
      });
    });

    it('should treat an underscore as a word character', () => {
      const result = resolveTextFragmentMatch('a_b', { start: 'a' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });
  });

  describe('prefix placement', () => {
    it('should resolve when only whitespace separates the prefix from the start term', () => {
      const result = resolveTextFragmentMatch('const\n  value', { prefix: 'const', start: 'value' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 8, end: 13 }]);
      });
    });

    it('should not resolve when other text separates the prefix from the start term', () => {
      const result = resolveTextFragmentMatch('const x value', { prefix: 'const', start: 'value' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should not resolve when the prefix is absent', () => {
      const result = resolveTextFragmentMatch('foo', { prefix: 'x', start: 'foo' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should resolve at the later place when an earlier prefix occurrence fails', () => {
      const result = resolveTextFragmentMatch('foo foo foo bar', { prefix: 'foo foo', start: 'bar' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 12, end: 15 }]);
      });
    });
  });

  describe('suffix placement', () => {
    it('should resolve when only whitespace separates the start term from the suffix', () => {
      const result = resolveTextFragmentMatch('foo bar', { start: 'foo', suffix: 'bar' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 3 }]);
      });
    });

    it('should not resolve when other text separates the start term from the suffix', () => {
      const result = resolveTextFragmentMatch('foo x bar', { start: 'foo', suffix: 'bar' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should not resolve when the suffix text does not follow', () => {
      const result = resolveTextFragmentMatch('fooY', { start: 'foo', suffix: 'X' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should not resolve when the suffix would run past the document end', () => {
      const result = resolveTextFragmentMatch('foo', { start: 'foo', suffix: 'XX' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });
  });

  describe('start and end ranges', () => {
    it('should resolve a range spanning to the end term', () => {
      const text = 'start middle end';
      const result = resolveTextFragmentMatch(text, { start: 'start', end: 'end' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: text.length }]);
      });
    });

    it('should return one candidate per qualifying end occurrence', () => {
      const result = resolveTextFragmentMatch('a b b', { start: 'a', end: 'b' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([
          { start: 0, end: 3 },
          { start: 0, end: 5 },
        ]);
      });
    });

    it('should not resolve when the end term occurs before the start term ends', () => {
      const result = resolveTextFragmentMatch('end start', { start: 'start', end: 'end' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should not resolve when the end term is absent', () => {
      const result = resolveTextFragmentMatch('just start', { start: 'start', end: 'zzz' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should resolve with a suffix after the end term', () => {
      const result = resolveTextFragmentMatch('start endX', { start: 'start', end: 'end', suffix: 'X' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 9 }]);
      });
    });

    it('should drop end occurrences that lack the required suffix', () => {
      const result = resolveTextFragmentMatch('a bX bY', { start: 'a', end: 'b', suffix: 'Y' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 6 }]);
      });
    });

    it('should not resolve when no end occurrence has the required suffix', () => {
      const result = resolveTextFragmentMatch('a b', { start: 'a', end: 'b', suffix: 'X' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });
  });

  describe('blocks', () => {
    const BLOCK_SPANS = [
      { start: 0, end: 5 },
      { start: 5, end: 10 },
    ];
    const BLOCK_SPANS_BY_WORD = [
      { start: 0, end: 7 },
      { start: 7, end: 11 },
    ];

    it('should refuse a term that spans two blocks', () => {
      const result = resolveTextFragmentMatch('alpha beta', { start: 'alpha beta' }, { blockSpans: BLOCK_SPANS });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should accept the same term when the document has no blocks', () => {
      const result = resolveTextFragmentMatch('alpha beta', { start: 'alpha beta' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 10 }]);
      });
    });

    it('should resolve a range whose terms sit in different blocks', () => {
      const result = resolveTextFragmentMatch('alpha beta', { start: 'alpha', end: 'beta' }, { blockSpans: BLOCK_SPANS });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 10 }]);
      });
    });

    it('should refuse an end term that spans two blocks', () => {
      const result = resolveTextFragmentMatch('one two two', { start: 'one', end: 'two two' }, { blockSpans: BLOCK_SPANS_BY_WORD });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should accept the same end term when the document has no blocks', () => {
      const result = resolveTextFragmentMatch('one two two', { start: 'one', end: 'two two' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 11 }]);
      });
    });

    it('should read block spans as raw offsets and map them through the normalizer', () => {
      const result = resolveTextFragmentMatch('alpha\r\nbeta', { start: 'alpha beta' }, { blockSpans: [{ start: 0, end: 11 }] });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 11 }]);
      });
    });
  });

  describe('whitespace', () => {
    it('should read a whitespace run as one space by default', () => {
      const result = resolveTextFragmentMatch('alpha\n    beta', { start: 'alpha beta' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 14 }]);
      });
    });

    it('should compare whitespace exactly when collapsing is off', () => {
      const result = resolveTextFragmentMatch('alpha\n    beta', { start: 'alpha beta' }, { collapseWhitespace: false });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });

    it('should not treat a non-breaking space as whitespace', () => {
      const result = resolveTextFragmentMatch('alpha beta', { start: 'alpha beta' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([]);
      });
    });
  });

  describe('candidate maximum', () => {
    const withinLimit = 'a '.repeat(DEFAULT_MAX_CANDIDATES).trim();
    const overLimit = 'a '.repeat(DEFAULT_MAX_CANDIDATES + 1).trim();

    it('should return every candidate when the count reaches the maximum exactly', () => {
      const result = resolveTextFragmentMatch(withinLimit, { start: 'a' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual(Array.from({ length: DEFAULT_MAX_CANDIDATES }, (_unused, index) => ({ start: index * 2, end: index * 2 + 1 })));
      });
    });

    it('should fail with the maximum when more places match than allowed', () => {
      const result = resolveTextFragmentMatch(overLimit, { start: 'a' });

      expect(result).toHaveDetailedError('MATCH_TOO_MANY_CANDIDATES', {
        message: `Directive matches more than ${DEFAULT_MAX_CANDIDATES} places in the document`,
        functionName: 'resolveTextFragmentMatch',
        details: { maximum: DEFAULT_MAX_CANDIDATES },
      });
    });

    it('should honour a caller-supplied maximum', () => {
      const result = resolveTextFragmentMatch('a a a a', { start: 'a' }, { maxCandidates: 2 });

      expect(result).toHaveDetailedError('MATCH_TOO_MANY_CANDIDATES', {
        message: 'Directive matches more than 2 places in the document',
        functionName: 'resolveTextFragmentMatch',
        details: { maximum: 2 },
      });
    });
  });

  describe('CRLF documents', () => {
    it('should remap a match on a later line to raw offsets', () => {
      const result = resolveTextFragmentMatch('ab\r\ncd', { start: 'cd' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 4, end: 6 }]);
      });
    });

    it('should keep a match end before the line ending at its own offset', () => {
      const result = resolveTextFragmentMatch('ab\r\ncd', { start: 'ab' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 0, end: 2 }]);
      });
    });

    it('should remap across multiple CRLF line endings', () => {
      const result = resolveTextFragmentMatch('x\r\ny\r\nz', { start: 'y' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 3, end: 4 }]);
      });
    });

    it('should not translate offsets when the document is LF-only', () => {
      const result = resolveTextFragmentMatch('ab\ncd', { start: 'cd' });

      expect(result).toBeSuccessWith((candidates: Array<{ start: number; end: number }>) => {
        expect(candidates).toStrictEqual([{ start: 3, end: 5 }]);
      });
    });
  });
});
