import { parseTextFragment, resolveTextFragmentMatch } from '../../../index';
import type { WptCase, WptRefusal } from '../../fixtures/wpt/WptCase';
import type { WptDocument } from '../../fixtures/wpt/WptDocument';

/**
 * The path a ported link hangs its directive on.
 *
 * A browser reads a fragment, which is the part of a URL after `#`. This
 * package reads a link, which is a path followed by the same directive, so the
 * fragment's leading `#` comes off and the document's path goes in front.
 */
const documentPath = 'document.txt';

const toLink = (fragment: string): string => `${documentPath}${fragment.slice(1)}`;

/**
 * Describe the refusal a case expects, field by field.
 *
 * A field the case does not name stays absent, because the matcher compares an
 * absent expectation against a populated error as a mismatch. Naming the
 * fields a case does not expect to see would either weaken the assertion or
 * make it fail, and neither is what the corpus says.
 */
const describeRefusal = (error: WptRefusal): Record<string, unknown> => {
  const expected: Record<string, unknown> = { message: error.message, functionName: error.functionName };
  if (error.details !== undefined) {
    expected.details = error.details;
  }
  return expected;
};

/**
 * Run one ported case against a ported target document.
 *
 * The corpus observes a browser: it hands a fragment to a page and reads where
 * the page landed. The same fragment reaches this package as a link, and the
 * three answers the corpus gives become:
 * - `match-in` - the browser scrolled, so the link parses and its first match
 *   starts in the named block;
 * - `no-match` - the browser stayed put, so the link parses and nothing
 *   matched;
 * - `refused` - the browser found no directive at all, so this package refuses
 *   the link with the error the case names.
 *
 * Only the first match is asserted for a `match-in` case, because that is the
 * one the browser acts on. What the later candidates are is this package's own
 * contract, and the package's own suites cover it.
 */
export const runWptCase = (testCase: WptCase, document: WptDocument): void => {
  const outcome = testCase.outcome;
  if (outcome.status !== 'ported') {
    throw new Error(`${testCase.id} is recorded as ${outcome.status} and cannot run`);
  }

  const parsed = parseTextFragment(toLink(testCase.fragment));
  const expectation = outcome.expectation;

  if (expectation.kind === 'refused') {
    expect(parsed).toHaveDetailedError(expectation.error.code, describeRefusal(expectation.error));
    return;
  }

  expect(parsed).toBeSuccessWith((fragment) => {
    const result = resolveTextFragmentMatch(document.text, fragment.directive);

    if (expectation.kind === 'no-match') {
      expect(result).toBeSuccessWith((candidates) => {
        expect(candidates).toStrictEqual([]);
      });
      return;
    }

    expect(result).toBeSuccessWith((candidates) => {
      const matchedBlocks = candidates.map((candidate) => document.blockNameAt(candidate.start));
      expect(matchedBlocks[0]).toBe(expectation.block);
    });
  });
};

/**
 * Declare a ported corpus as a Jest suite.
 *
 * Every case gets one test, titled with its corpus id, its verbatim corpus
 * description, and the permalink to the line it was transcribed from, so a
 * failure names the upstream case without a lookup. A case that does not run is
 * declared as a skipped test carrying its outcome and reason, which keeps the
 * gap visible in the run rather than leaving it out of the suite.
 */
export const describeWptCorpus = (corpus: string, document: WptDocument, cases: ReadonlyArray<WptCase>): void => {
  describe(corpus, () => {
    for (const testCase of cases) {
      const title = `${testCase.id}: ${testCase.description} [${testCase.permalink}]`;

      if (testCase.outcome.status === 'ported') {
        it(title, () => {
          runWptCase(testCase, document);
        });
        continue;
      }

      it.skip(`${title} - ${testCase.outcome.status}: ${testCase.outcome.reason}`, () => undefined);
    }
  });
};
