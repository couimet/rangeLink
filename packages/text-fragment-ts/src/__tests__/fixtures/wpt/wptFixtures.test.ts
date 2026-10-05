import { FIND_RANGE_CASES, FIND_RANGE_DOCUMENT } from './findRangeFromTextDirective';
import { PERCENT_ENCODING_CASES, PERCENT_ENCODING_DOCUMENT } from './percentEncoding';
import { SCROLL_TO_TEXT_CASES, SCROLL_TO_TEXT_DOCUMENT } from './scrollToTextFragment';
import type { WptCase } from './WptCase';
import type { WptDocument } from './WptDocument';
import { WPT_REVISION } from './wptSource';

interface PortedCorpus {
  readonly file: string;
  readonly document: WptDocument;
  readonly cases: ReadonlyArray<WptCase>;
}

/**
 * Every ported corpus, so a rule about the fixtures holds for all of them.
 */
const CORPORA: ReadonlyArray<PortedCorpus> = [
  { file: 'find-range-from-text-directive.html', document: FIND_RANGE_DOCUMENT, cases: FIND_RANGE_CASES },
  { file: 'scroll-to-text-fragment.html', document: SCROLL_TO_TEXT_DOCUMENT, cases: SCROLL_TO_TEXT_CASES },
  { file: 'percent-encoding.html', document: PERCENT_ENCODING_DOCUMENT, cases: PERCENT_ENCODING_CASES },
];

const PERMALINK_PREFIX = `https://github.com/web-platform-tests/wpt/blob/${WPT_REVISION}/scroll-to-text-fragment`;

const allCases = (): ReadonlyArray<WptCase> => CORPORA.flatMap((corpus) => corpus.cases);

const findOffenders = (predicate: (testCase: WptCase) => boolean): ReadonlyArray<string> =>
  allCases()
    .filter(predicate)
    .map((testCase) => testCase.id);

const containsHash = (fragment: string): boolean => fragment.startsWith('#');

const hasNonEmptyReason = (testCase: WptCase): boolean => testCase.outcome.status === 'ported' || testCase.outcome.reason.trim().length > 0;

const namesThePinnedRevision = (testCase: WptCase): boolean => testCase.permalink.startsWith(`${PERMALINK_PREFIX}/`);

const namesAnEarlierSourceLine = (testCase: WptCase): boolean => {
  const line = Number(testCase.permalink.split('#L')[1]);
  return Number.isInteger(line) && line > 0;
};

describe('ported corpus fixtures', () => {
  it('should link every case to the revision the corpus was transcribed from', () => {
    expect(findOffenders((testCase) => !namesThePinnedRevision(testCase))).toStrictEqual([]);
    expect(findOffenders((testCase) => !namesAnEarlierSourceLine(testCase))).toStrictEqual([]);
  });

  it('should name the corpus file each case came from', () => {
    const mismatched = CORPORA.flatMap((corpus) =>
      corpus.cases.filter((testCase) => !testCase.permalink.startsWith(`${PERMALINK_PREFIX}/${corpus.file}#L`)).map((testCase) => testCase.id),
    );

    expect(mismatched).toStrictEqual([]);
  });

  it('should give every case a unique id', () => {
    const ids = allCases().map((testCase) => testCase.id);
    const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicated).toStrictEqual([]);
  });

  it('should number the cases in the order the corpus lists them', () => {
    const misnumbered = CORPORA.flatMap((corpus) =>
      corpus.cases.filter((testCase, index) => !testCase.id.endsWith(String(index + 1).padStart(3, '0'))).map((testCase) => testCase.id),
    );

    expect(misnumbered).toStrictEqual([]);
  });

  it('should carry every fragment with the hash a fragment starts with', () => {
    expect(findOffenders((testCase) => !containsHash(testCase.fragment))).toStrictEqual([]);
  });

  it('should record a reason for every case that does not run', () => {
    expect(findOffenders((testCase) => !hasNonEmptyReason(testCase))).toStrictEqual([]);
  });

  it('should expect a match in a block its own document holds', () => {
    const unknownBlocks = CORPORA.flatMap((corpus) =>
      corpus.cases
        .filter(
          (testCase) =>
            testCase.outcome.status === 'ported' &&
            testCase.outcome.expectation.kind === 'match-in' &&
            !corpus.document.blockNames.includes(testCase.outcome.expectation.block),
        )
        .map((testCase) => testCase.id),
    );

    expect(unknownBlocks).toStrictEqual([]);
  });

  it('should name the first and last block at the document offsets that hold them', () => {
    for (const corpus of CORPORA) {
      expect({
        first: corpus.document.blockNameAt(0),
        last: corpus.document.blockNameAt(corpus.document.text.length - 1),
      }).toStrictEqual({
        first: corpus.document.blockNames[0],
        last: corpus.document.blockNames[corpus.document.blockNames.length - 1],
      });
    }
  });
});
