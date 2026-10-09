/**
 * Ported from web-platform-tests, which is distributed under the 3-Clause BSD
 * license. See the NOTICE file at the repository root.
 *
 * Transcribed from the file at the revision pinned in ./wptSource.ts:
 * https://github.com/web-platform-tests/wpt/blob/7f439c226694df407f6ae71b7a86a3794cc67776/scroll-to-text-fragment/percent-encoding.html
 *
 * Every case below links to the exact line it came from.
 *
 * The percent-encoding corpus, which asks which paragraph a browser lands on for a
 * fragment that carries a percent character. Each case is ported as the paragraph its
 * first match starts in.
 */

import type { WptCase } from './WptCase';
import { buildDocument } from './WptDocument';
import { wptPermalink } from './wptSource';

/**
 * The text of the percent-encoding page, as named blocks in document order.
 *
 * Each block is a paragraph a case can land on, and the block name is the
 * element id the corpus reads back.
 */
export const PERCENT_ENCODING_DOCUMENT = buildDocument({
  singlepercent: '%',
  doublepercent: '%%',
  percentf: '%F',
  doublepercentf: '%%f',
  checkmark: '✅',
  helloworld: 'Hello world',
});

/**
 * Every case in the corpus, in the order the corpus lists them.
 */
export const PERCENT_ENCODING_CASES: ReadonlyArray<WptCase> = [
  {
    id: 'percent-encoding-001',
    description: 'Percent-encoded "%" char.',
    fragment: '#:~:text=%25',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'singlepercent' } },
    permalink: wptPermalink('percent-encoding.html', 32),
  },
  {
    id: 'percent-encoding-002',
    description: 'Percent char without hex digits is invalid.',
    fragment: '#:~:text=%',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'singlepercent' } },
    permalink: wptPermalink('percent-encoding.html', 37),
  },
  {
    id: 'percent-encoding-003',
    description: 'Percent char followed by percent char is invalid.',
    fragment: '#:~:text=%%',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'doublepercent' } },
    permalink: wptPermalink('percent-encoding.html', 42),
  },
  {
    id: 'percent-encoding-004',
    description: 'Single digit percent-encoding is invalid.',
    fragment: '#:~:text=%F',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'percentf' } },
    permalink: wptPermalink('percent-encoding.html', 47),
  },
  {
    id: 'percent-encoding-005',
    description: 'Percent-encoding limited to two digits.',
    fragment: '#:~:text=%25F',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'percentf' } },
    permalink: wptPermalink('percent-encoding.html', 52),
  },
  {
    id: 'percent-encoding-006',
    description: 'Percent-encoded "%%F"',
    fragment: '#:~:text=%25%25F',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'doublepercentf' } },
    permalink: wptPermalink('percent-encoding.html', 57),
  },
  {
    id: 'percent-encoding-007',
    description: 'Percent-encoding multibyte codepoint (CHECKMARK).',
    fragment: '#:~:text=%E2%9C%85',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'checkmark' } },
    permalink: wptPermalink('percent-encoding.html', 62),
  },
];
