/**
 * Ported from web-platform-tests, which is distributed under the 3-Clause BSD
 * license. See the NOTICE file at the repository root.
 *
 * Transcribed from the file at the revision pinned in ./wptSource.ts:
 * https://github.com/web-platform-tests/wpt/blob/7f439c226694df407f6ae71b7a86a3794cc67776/scroll-to-text-fragment/find-range-from-text-directive.html
 *
 * Every case below links to the exact line it came from.
 *
 * The find-a-range-from-a-text-directive corpus, which asks whether a browser scrolls
 * the page after reading a directive. Each case is ported as the place its first
 * match starts, or as a miss when the browser does not scroll.
 */

import type { WptCase } from './WptCase';
import { buildDocument } from './WptDocument';
import { wptPermalink } from './wptSource';

/**
 * The text of `find-range-from-text-directive-target.html`, the page every case
 * below runs against, as named blocks in document order.
 *
 * The two blocks before the tall spacer hold text a browser searches but does
 * not scroll to, so a match there leaves the page where it started. The spacer
 * itself renders nothing, and it sits between them and the prose below.
 *
 * The `lorem` block states the words the page shows between its hidden
 * elements: the non-breaking spaces the page uses there read as ordinary
 * spaces here, because this matcher skips ASCII whitespace only.
 */
export const FIND_RANGE_DOCUMENT = buildDocument({
  /** `<span id="generatedSearch">`, whose text a `::before` rule supplies. */
  generated: 'search',

  /** Text before the spacer: a match here cannot move the page. */
  decoy: "Won't scroll if matched: match suffix match suffix3",

  /** The first paragraph of prose. */
  fox: 'The quick brown fox jumped over the lazy dog. a a b b b c',

  /** The second paragraph of prose. */
  'foo-bar': 'foo foo foo bar bar bar',

  /** The third paragraph, whose first word matches the generated text. */
  'search-flatten': 'search Two words ending in flatten',

  /** The fourth paragraph, whose first word repeats the text before the spacer. */
  'match-suffix': 'match suffix2 prefix match suffix3 matchEnd suffix4 matchEnd suffix5',

  /** The words the page shows around its hidden elements. */
  lorem: 'Lorem Ipsum Whitespace Dipsum',

  /** Text a hidden inline subtree splits, and the text a reader sees in full. */
  'display-none': 'Text with display: none',

  /** Text a hidden block-level subtree splits, with and without a block boundary. */
  'hidden-block': 'Text with visibility: hidden as block boundary',
  'hidden-inline': 'Text with visibility: hidden as inline',

  /** Text a hidden iframe, an image element and a broken image interrupt. */
  iframe: 'Text with Iframe',
  image: 'Text with image',
  'broken-image': 'What had said',

  /** The line whose inline element boundary is not a word boundary. */
  'hand-and-a': 'She caught it in one hand and a net. zzz',

  /** The last paragraph of the page. */
  'end-of-document': 'This text appears at the end of the document',
});

/**
 * Every case in the corpus, in the order the corpus lists them.
 */
export const FIND_RANGE_CASES: ReadonlyArray<WptCase> = [
  {
    id: 'find-range-001',
    description: 'Basic smoke test - full word match',
    fragment: '#:~:text=jumped',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 40),
  },
  {
    id: 'find-range-002',
    description: 'Prefix must start on a word boundary',
    fragment: '#:~:text=u-,mped',
    specStep: '2.2.1',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 46),
  },
  {
    id: 'find-range-003',
    description: 'Prefix need not end on a word boundary',
    fragment: '#:~:text=ju-,mped',
    specStep: '2.2.1',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 52),
  },
  {
    id: 'find-range-004',
    description: "Prefix doesn't exist",
    fragment: '#:~:text=null-,The%20quick',
    specStep: '2.2.2',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 58),
  },
  {
    id: 'find-range-005',
    description: 'Multiple overlapping prefixes',
    fragment: '#:~:text=foo%20foo-,bar',
    specStep: '2.2.3',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'foo-bar' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 64),
  },
  {
    id: 'find-range-006',
    description: 'Multiple overlapping one letter prefixes',
    fragment: '#:~:text=a%20a-,b',
    specStep: '2.2.3',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 70),
  },
  {
    id: 'find-range-007',
    description: 'Prefix overlaps match text',
    fragment: '#:~:text=quick%20brown-,brown%20fox',
    specStep: '2.2.4',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 76),
  },
  {
    id: 'find-range-008',
    description: 'Match text after prefix',
    fragment: '#:~:text=quick%20brown-,fox',
    specStep: '2.2.4',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 82),
  },
  {
    id: 'find-range-009',
    description: 'Search invisible content between prefix and match',
    fragment: '#:~:text=Lorem-,Ipsum',
    specStep: '2.2.5',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'lorem' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 88),
  },
  {
    id: 'find-range-010',
    description: 'Prefix appears at end of document',
    fragment: '#:~:text=end%20of%20the%20document-,test',
    specStep: '2.2.6',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 94),
  },
  {
    id: 'find-range-011',
    description: '|end| forces |start| to end on word boundary',
    fragment: '#:~:text=fox-,jum,over',
    specStep: '2.2.8',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 100),
  },
  {
    id: 'find-range-012',
    description: 'no |end| or suffix forces |start| to end on word boundary',
    fragment: '#:~:text=fox-,jum',
    specStep: '2.2.8',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 106),
  },
  {
    id: 'find-range-013',
    description: 'suffix means |start| need not end on word boundary',
    fragment: '#:~:text=fox-,jum,-ped',
    specStep: '2.2.8',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 112),
  },
  {
    id: 'find-range-014',
    description: "|start| doesn't need to start on word boundary",
    fragment: '#:~:text=jum-,ped',
    specStep: '2.2.9',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 118),
  },
  {
    id: 'find-range-015',
    description: 'prefix with non-existent exact match',
    fragment: '#:~:text=jumped-,null',
    specStep: '2.2.10',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 124),
  },
  {
    id: 'find-range-016',
    description: 'prefix with non-existent range match',
    fragment: '#:~:text=jumped-,null,lazy',
    specStep: '2.2.10',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 130),
  },
  {
    id: 'find-range-017',
    description: "match doesn't immediately follow prefix",
    fragment: '#:~:text=brown-,jumped',
    specStep: '2.2.11',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 136),
  },
  {
    id: 'find-range-018',
    description: "match doesn't immediately follow first prefix instance",
    fragment: '#:~:text=foo-,bar',
    specStep: '2.2.11',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'foo-bar' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 142),
  },
  {
    id: 'find-range-019',
    description: 'Generated content matching prefix does not prevent a later match',
    fragment: '#:~:text=search-,Two,flatten',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'search-flatten' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 147),
  },
  {
    id: 'find-range-020',
    description: 'no-prefix; |end| forces |start| to end on word boundary',
    fragment: '#:~:text=jum,over',
    specStep: '2.3.1',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 153),
  },
  {
    id: 'find-range-021',
    description: 'no-prefix; no |end| or suffix forces |start| to end on word boundary',
    fragment: '#:~:text=jum',
    specStep: '2.3.1',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 159),
  },
  {
    id: 'find-range-022',
    description: 'no-prefix; suffix means |start| need not end on word boundary',
    fragment: '#:~:text=jum,-ped',
    specStep: '2.3.1',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 165),
  },
  {
    id: 'find-range-023',
    description: '|start| must start on a word boundary',
    fragment: '#:~:text=umped',
    specStep: '2.3.2',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 171),
  },
  {
    id: 'find-range-024',
    description: 'non-existent exact match',
    fragment: '#:~:text=null',
    specStep: '2.3.3',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 177),
  },
  {
    id: 'find-range-025',
    description: 'non-existent range match',
    fragment: '#:~:text=null,lazy',
    specStep: '2.3.3',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 183),
  },
  {
    id: 'find-range-026',
    description: 'overlapping exact matches with suffix',
    fragment: '#:~:text=b%20b,-c',
    specStep: '2.3.4',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 189),
  },
  {
    id: 'find-range-027',
    description: 'overlapping one letter exact matches with suffix',
    fragment: '#:~:text=foo%20foo,-bar',
    specStep: '2.3.4',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'foo-bar' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 195),
  },
  {
    id: 'find-range-028',
    description: 'matching range search',
    fragment: '#:~:text=brown,fox',
    specStep: '2.5.1',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 201),
  },
  {
    id: 'find-range-029',
    description: 'inverted range search',
    fragment: '#:~:text=brown,quick',
    specStep: '2.4',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 207),
  },
  {
    id: 'find-range-030',
    description: 'no suffix forces |end| to be end bounded',
    fragment: '#:~:text=quick,bro',
    specStep: '2.5.1.1',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 213),
  },
  {
    id: 'find-range-031',
    description: 'suffix means |end| need not be end bounded',
    fragment: '#:~:text=quick,bro,-wn',
    specStep: '2.5.1.1',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 219),
  },
  {
    id: 'find-range-032',
    description: '|end| must be start bounded',
    fragment: '#:~:text=quick,ro,-wn',
    specStep: '2.5.1.2',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 225),
  },
  {
    id: 'find-range-033',
    description: '|end| must be start bounded even if full range is word bounded',
    fragment: '#:~:text=bro,wn',
    specStep: '2.5.1.2',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 231),
  },
  {
    id: 'find-range-034',
    description: 'non-existent |end|',
    fragment: '#:~:text=quick,null',
    specStep: '2.5.1.3',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 237),
  },
  {
    id: 'find-range-035',
    description: 'Range with preceeding suffix',
    fragment: '#:~:text=quick,jumped,-fox',
    specStep: '2.5.1.4',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 243),
  },
  {
    id: 'find-range-036',
    description: 'Match with no suffix',
    fragment: '#:~:text=The-,quick,brown',
    specStep: '2.5.3',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 249),
  },
  {
    id: 'find-range-037',
    description: 'Suffix comes before |end|',
    fragment: '#:~:text=The-,quick,fox,-brown',
    specStep: '2.5.4',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 255),
  },
  {
    id: 'find-range-038',
    description: 'Search invisible content between |end| and suffix',
    fragment: '#:~:text=Lorem-,Ipsum,Whitespace,-Dipsum',
    specStep: '2.5.5',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'lorem' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 261),
  },
  {
    id: 'find-range-039',
    description: 'Suffix must be end bounded',
    fragment: '#:~:text=quick,-bro',
    specStep: '2.5.6',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 267),
  },
  {
    id: 'find-range-040',
    description: 'Suffix need not be start bounded',
    fragment: '#:~:text=qu,-ick',
    specStep: '2.5.6',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'fox' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 273),
  },
  {
    id: 'find-range-041',
    description: 'Non-existent suffix',
    fragment: '#:~:text=quick,-null',
    specStep: '2.5.7',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 279),
  },
  {
    id: 'find-range-042',
    description: 'Content appears between match and suffix',
    fragment: '#:~:text=quick,-fox',
    specStep: '2.5.8',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 285),
  },
  {
    id: 'find-range-043',
    description: 'Non-matching suffix in first potential match',
    fragment: '#:~:text=match,-suffix2',
    specStep: '2.5.9',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'match-suffix' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 291),
  },
  {
    id: 'find-range-044',
    description: 'Non-matching suffix search continues to prefix match',
    fragment: '#:~:text=prefix-,match,-suffix3',
    specStep: '2.5.9',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'match-suffix' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 297),
  },
  {
    id: 'find-range-045',
    description: 'Range end matches correct suffix',
    fragment: '#:~:text=prefix-,match,matchEnd,-suffix5',
    specStep: '2.5.10',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'match-suffix' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 303),
  },
  {
    id: 'find-range-046',
    description: '`start` element contains search-invisible text (display: none)',
    fragment: '#:~:text=Text%20with%20display:%20none',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'display-none' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 308),
  },
  {
    id: 'find-range-047',
    description: '`start` element contains hidden text, which is a block boundary',
    fragment: '#:~:text=Text%20with%20visibility:%20hidden%20as%20block%20boundary',
    outcome: {
      status: 'not-applicable',
      reason:
        'the case turns on a block boundary that a hidden block-level element draws inside a run of text, and a plain-text document carries no block boundaries',
    },
    permalink: wptPermalink('find-range-from-text-directive.html', 313),
  },
  {
    id: 'find-range-048',
    description: '`start` element contains hidden text which is not a block boundary',
    fragment: '#:~:text=Text%20with%20visibility:%20hidden%20as%20inline',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'hidden-inline' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 318),
  },
  {
    id: 'find-range-049',
    description: '`start` element contains search-invisible text (iframe)',
    fragment: '#:~:text=Text%20with%20Iframe',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'iframe' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 323),
  },
  {
    id: 'find-range-050',
    description: '`start` element contains search-invisible text (image)',
    fragment: '#:~:text=Text%20with%20image',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'image' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 328),
  },
  {
    id: 'find-range-051',
    description: '|end| can match after an overlapping rejected candidate',
    fragment: '#:~:text=caught,and%20a',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'hand-and-a' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 333),
  },
  {
    id: 'find-range-052',
    description: 'Inline node boundary is not a word boundary',
    fragment: '#:~:text=z',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 341),
  },
  {
    id: 'find-range-053',
    description: 'Match across broken image',
    fragment: '#:~:text=what%20had',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'broken-image' } },
    permalink: wptPermalink('find-range-from-text-directive.html', 346),
  },
];
