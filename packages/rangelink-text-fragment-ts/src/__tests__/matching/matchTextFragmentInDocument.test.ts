import { DEFAULT_CASE_POLICY } from '../../constants/textFragmentMatch';
import { formatTextFragment, parseTextFragment } from '../../index';
import { matchTextFragmentInDocument } from '../../matching';

import * as textFragmentModule from 'text-fragment-ts';

const THREE_CANDIDATES = [
  { start: 0, end: 1 },
  { start: 4, end: 5 },
  { start: 8, end: 9 },
];

const TWO_CASE_VARIANTS = [
  { start: 0, end: 3 },
  { start: 4, end: 7 },
];

const TWO_OCCURRENCES = [
  { start: 4, end: 7 },
  { start: 8, end: 11 },
];

describe('matchTextFragmentInDocument', () => {
  describe('outcomes', () => {
    it('should return the one matching place as a match', () => {
      const result = matchTextFragmentInDocument('the quick brown fox', { start: 'brown' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'matched', start: 10, end: 15 });
      });
    });

    it('should return not-found when the directive matches nowhere', () => {
      const result = matchTextFragmentInDocument('the quick brown fox', { start: 'zebra' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'not-found' });
      });
    });

    it('should return every candidate when several places match', () => {
      const result = matchTextFragmentInDocument('a b a b a', { start: 'a' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'ambiguous', candidates: THREE_CANDIDATES });
      });
    });
  });

  describe('case policy', () => {
    it('should ship prefer-sensitive as the default policy', () => {
      expect(DEFAULT_CASE_POLICY).toBe('prefer-sensitive');
    });

    it('should match only the exact text when the policy is sensitive', () => {
      const result = matchTextFragmentInDocument('Foo foo', { start: 'Foo' }, { casePolicy: 'sensitive' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'matched', start: 0, end: 3 });
      });
    });

    it('should report not-found when the policy is sensitive and only another case matches', () => {
      const result = matchTextFragmentInDocument('FOO bar', { start: 'foo' }, { casePolicy: 'sensitive' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'not-found' });
      });
    });

    it('should match every case variant when the policy is insensitive', () => {
      const result = matchTextFragmentInDocument('Foo foo', { start: 'Foo' }, { casePolicy: 'insensitive' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'ambiguous', candidates: TWO_CASE_VARIANTS });
      });
    });

    it('should use the shipped policy when the settings name none', () => {
      const result = matchTextFragmentInDocument('Foo foo', { start: 'Foo' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'matched', start: 0, end: 3 });
      });
    });

    it('should fall back to a case-insensitive pass when the exact pass finds nothing', () => {
      const result = matchTextFragmentInDocument('FOO bar', { start: 'foo' }, { casePolicy: 'prefer-sensitive' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'matched', start: 0, end: 3 });
      });
    });

    it('should never reach the case-insensitive pass when the exact pass matched', () => {
      // The fallback pass is unrepresentable under this maximum: it would find
      // a second place and refuse, so a match proves the fallback never ran.
      const result = matchTextFragmentInDocument('Foo foo', { start: 'Foo' }, { casePolicy: 'prefer-sensitive', maxCandidates: 1 });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'matched', start: 0, end: 3 });
      });
    });

    it('should refuse when the fallback pass exceeds the candidate maximum', () => {
      // The exact pass finds nothing, so only the fallback pass can be what
      // pushed the search past its bound.
      const result = matchTextFragmentInDocument('A B A B A', { start: 'a' }, { casePolicy: 'prefer-sensitive', maxCandidates: 2 });

      expect(result).toHaveDetailedError('MATCH_TOO_MANY_CANDIDATES', {
        message: 'Directive matches more than 2 places in the document',
        functionName: 'resolveTextFragmentMatch',
        details: { maximum: 2 },
      });
    });

    it('should run one case-sensitive pass when the exact text matches', () => {
      const resolveSpy = jest.spyOn(textFragmentModule, 'resolveTextFragmentMatch');

      matchTextFragmentInDocument('Foo foo', { start: 'Foo' });

      expect(resolveSpy).toHaveBeenCalledTimes(1);
      expect(resolveSpy).toHaveBeenCalledWith(
        'Foo foo',
        { start: 'Foo' },
        {
          caseSensitivity: 'sensitive',
          maxCandidates: undefined,
          blockSpans: undefined,
          collapseWhitespace: undefined,
        },
      );
    });

    it('should run a second pass only when the exact pass found nothing', () => {
      const resolveSpy = jest.spyOn(textFragmentModule, 'resolveTextFragmentMatch');

      matchTextFragmentInDocument('FOO bar', { start: 'foo' });

      expect(resolveSpy).toHaveBeenCalledTimes(2);
      expect(resolveSpy).toHaveBeenNthCalledWith(
        1,
        'FOO bar',
        { start: 'foo' },
        {
          caseSensitivity: 'sensitive',
          maxCandidates: undefined,
          blockSpans: undefined,
          collapseWhitespace: undefined,
        },
      );
      expect(resolveSpy).toHaveBeenNthCalledWith(
        2,
        'FOO bar',
        { start: 'foo' },
        {
          caseSensitivity: 'insensitive',
          maxCandidates: undefined,
          blockSpans: undefined,
          collapseWhitespace: undefined,
        },
      );
    });

    it('should run the one pass the policy names', () => {
      const resolveSpy = jest.spyOn(textFragmentModule, 'resolveTextFragmentMatch');

      matchTextFragmentInDocument('Foo foo', { start: 'Foo' }, { casePolicy: 'insensitive' });

      expect(resolveSpy).toHaveBeenCalledTimes(1);
      expect(resolveSpy).toHaveBeenCalledWith(
        'Foo foo',
        { start: 'Foo' },
        {
          caseSensitivity: 'insensitive',
          maxCandidates: undefined,
          blockSpans: undefined,
          collapseWhitespace: undefined,
        },
      );
    });
  });

  describe('settings', () => {
    it('should refuse when the candidates exceed the maximum', () => {
      const result = matchTextFragmentInDocument('a b a b a', { start: 'a' }, { maxCandidates: 2 });

      expect(result).toHaveDetailedError('MATCH_TOO_MANY_CANDIDATES', {
        message: 'Directive matches more than 2 places in the document',
        functionName: 'resolveTextFragmentMatch',
        details: { maximum: 2 },
      });
    });

    it('should accept a candidate count exactly at the maximum', () => {
      const result = matchTextFragmentInDocument('a b a b a', { start: 'a' }, { maxCandidates: 3 });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'ambiguous', candidates: THREE_CANDIDATES });
      });
    });

    it('should confine a term to the block that contains it', () => {
      const result = matchTextFragmentInDocument('one two two', { start: 'two' }, { blockSpans: [{ start: 0, end: 7 }] });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'matched', start: 4, end: 7 });
      });
    });

    it('should consider every place when no block spans are supplied', () => {
      const result = matchTextFragmentInDocument('one two two', { start: 'two' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'ambiguous', candidates: TWO_OCCURRENCES });
      });
    });

    it('should read a line break as a space when whitespace collapse is on', () => {
      const result = matchTextFragmentInDocument('alpha\nbeta', { start: 'alpha beta' });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'matched', start: 0, end: 10 });
      });
    });

    it('should match the text exactly when whitespace collapse is off', () => {
      const result = matchTextFragmentInDocument('alpha\nbeta', { start: 'alpha beta' }, { collapseWhitespace: false });

      expect(result).toBeSuccessWith((outcome) => {
        expect(outcome).toStrictEqual({ status: 'not-found' });
      });
    });
  });

  describe('barrel', () => {
    it('should re-export the codec parsing entry point', () => {
      const parsed = parseTextFragment('src/file.ts:~:text=value');

      expect(parsed).toBeSuccessWith((value) => {
        expect(value).toStrictEqual({ path: 'src/file.ts', directive: { start: 'value' } });
      });
    });

    it('should re-export the codec formatting entry point', () => {
      const formatted = formatTextFragment('src/file.ts', { start: 'value' });

      expect(formatted).toBeSuccessWith((value) => {
        expect(value).toBe('src/file.ts:~:text=value');
      });
    });
  });
});
