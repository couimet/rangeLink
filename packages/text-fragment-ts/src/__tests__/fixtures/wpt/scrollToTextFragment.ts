/**
 * Ported from web-platform-tests, which is distributed under the 3-Clause BSD
 * license. See the NOTICE file at the repository root.
 *
 * Transcribed from the file at the revision pinned in ./wptSource.ts:
 * https://github.com/web-platform-tests/wpt/blob/7f439c226694df407f6ae71b7a86a3794cc67776/scroll-to-text-fragment/scroll-to-text-fragment.html
 *
 * Every case below links to the exact line it came from.
 *
 * The scroll-to-text-fragment corpus, which asks which section of the target page a
 * browser lands on. Each case is ported as the place its first match starts, or as a
 * miss when the browser stays at the top.
 */

import type { WptCase } from './WptCase';
import { buildDocument } from './WptDocument';
import { wptPermalink } from './wptSource';

/**
 * The text of `scroll-to-text-fragment-target.html`, the page every case
 * below runs against, as named blocks in document order.
 *
 * The page hides two paragraphs and shows the rest, each in its own tall
 * section, so the corpus can read which section the browser lands on. The
 * hidden paragraphs are absent here, because a browser does not search them,
 * and the shadow root's paragraph is present, because it does.
 */
export const SCROLL_TO_TEXT_DOCUMENT = buildDocument({
  /** The first section, whose text is a single word. */
  element: 'Element',

  /** The second section, a page of punctuation, a non-ASCII word and a line break. */
  text: "This is a test page !$'()*+./:;=?@_~ &,- ネコ\nfoo foo foo bar bar bar",

  /** The third section, which repeats the words the second section holds. */
  'more-text': 'More test page text',

  /** The fourth section, whose context terms and match sit in three separate nodes. */
  'cross-node-prefix': 'prefix',
  'cross-node-context': 'test page',
  'cross-node-suffix': 'suffix',

  /** The fifth section, whose text holds the directive's own punctuation. */
  'text-directive-parameters': 'this,is,test,page',

  /** The shadow root's paragraph, which a browser searches like any other text. */
  shadow: 'shadow text',

  /** The sections reached by scrolling sideways, not downwards. */
  'horizontal-scroll': 'horizontally scrolled text',
  'inline-horizontal-scroll': 'inline-horizontal-target',
});

/**
 * Every case in the corpus, in the order the corpus lists them.
 */
export const SCROLL_TO_TEXT_CASES: ReadonlyArray<WptCase> = [
  {
    id: 'scroll-to-text-001',
    description: 'Empty hash should scroll to top',
    fragment: '#',
    outcome: {
      status: 'ported',
      expectation: {
        kind: 'refused',
        error: {
          code: 'PARSE_TEXT_FRAGMENT_NO_SEPARATOR',
          message: 'Link must contain :~:text= separator',
          functionName: 'parseTextFragment',
        },
      },
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 24),
  },
  {
    id: 'scroll-to-text-002',
    description: 'Text directive with invalid syntax (context terms without "-") should not parse as a text directive',
    fragment: '#:~:text=this,is,test,page',
    outcome: {
      status: 'ported',
      expectation: {
        kind: 'refused',
        error: {
          code: 'PARSE_TEXT_FRAGMENT_BAD_STRUCTURE',
          message: 'Invalid text directive structure - expected [prefix-,]start[,end][,-suffix]',
          functionName: 'parseTextFragment',
          details: { termCount: 4 },
        },
      },
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 29),
  },
  {
    id: 'scroll-to-text-003',
    description: 'Text directive with invalid syntax (only prefix, no start text) should not parse as a text directive',
    fragment: '#:~:text=foo-',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 34),
  },
  {
    id: 'scroll-to-text-004',
    description: 'Text directive with invalid syntax (only suffix, no start text) should not parse as a text directive',
    fragment: '#:~:text=-foo',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 39),
  },
  {
    id: 'scroll-to-text-005',
    description: 'Generic fragment directive with existing element fragment should scroll to element',
    fragment: '#element:~:directive',
    outcome: {
      status: 'not-applicable',
      reason: 'the case pairs a text directive with an element fragment, and the corpus reads which element the browser lands on',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 44),
  },
  {
    id: 'scroll-to-text-006',
    description: 'Uppercase TEXT directive should not parse as a text directive',
    fragment: '#:~:TEXT=test',
    outcome: {
      status: 'ported',
      expectation: {
        kind: 'refused',
        error: {
          code: 'PARSE_TEXT_FRAGMENT_NO_SEPARATOR',
          message: 'Link must contain :~:text= separator',
          functionName: 'parseTextFragment',
        },
      },
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 49),
  },
  {
    id: 'scroll-to-text-007',
    description: 'Exact text with no context should match text',
    fragment: '#:~:text=test',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 55),
  },
  {
    id: 'scroll-to-text-008',
    description: 'Case-insensitive search with no context should match text',
    fragment: '#:~:text=TEST',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 60),
  },
  {
    id: 'scroll-to-text-009',
    description: 'Exact text with prefix should match text',
    fragment: '#:~:text=this is a-,test',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 65),
  },
  {
    id: 'scroll-to-text-010',
    description: 'Exact text with suffix should match text',
    fragment: '#:~:text=test,-page',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 70),
  },
  {
    id: 'scroll-to-text-011',
    description: 'Exact text with prefix and suffix should match text',
    fragment: '#:~:text=this is a-,test,-page',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 75),
  },
  {
    id: 'scroll-to-text-012',
    description: 'Exact text with prefix and suffix and query equals prefix.',
    fragment: '#:~:text=foo-,foo,-bar',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 81),
  },
  {
    id: 'scroll-to-text-013',
    description: 'Text range with no context should match text',
    fragment: '#:~:text=this,page',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 87),
  },
  {
    id: 'scroll-to-text-014',
    description: 'Text range with prefix should match text',
    fragment: '#:~:text=this-,is,test',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 92),
  },
  {
    id: 'scroll-to-text-015',
    description: 'Text range with suffix should match text',
    fragment: '#:~:text=this,test,-page',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 97),
  },
  {
    id: 'scroll-to-text-016',
    description: 'Text range with prefix and suffix should match text',
    fragment: '#:~:text=this-,is,test,-page',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 102),
  },
  {
    id: 'scroll-to-text-017',
    description: 'Text range with non-matching endText should not match',
    fragment: '#:~:text=this,none',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 108),
  },
  {
    id: 'scroll-to-text-018',
    description: 'Text range with non-matching startText should not match',
    fragment: '#:~:text=none,page',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 113),
  },
  {
    id: 'scroll-to-text-019',
    description: 'Text range with prefix and nonmatching suffix should not match',
    fragment: '#:~:text=this-,is,page,-none',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 119),
  },
  {
    id: 'scroll-to-text-020',
    description: 'Text range with nonmatching prefix and matching suffix should not match',
    fragment: '#:~:text=none-,this,test,-page',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 124),
  },
  {
    id: 'scroll-to-text-021',
    description: 'Exact text with percent encoded spaces should match text',
    fragment: '#:~:text=this%20is%20a%20test%20page',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 130),
  },
  {
    id: 'scroll-to-text-022',
    description: 'Non-whole-word exact text with spaces should not match',
    fragment: '#:~:text=test%20pag',
    outcome: { status: 'ported', expectation: { kind: 'no-match' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 135),
  },
  {
    id: 'scroll-to-text-023',
    description: 'Fragment directive with percent encoded syntactical characters "&,-" should match text',
    fragment: '#:~:text=%26%2C%2D',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 140),
  },
  {
    id: 'scroll-to-text-024',
    description: 'Fragment directive with percent encoded non-ASCII unicode character should match text',
    fragment: '#:~:text=%E3%83%8D%E3%82%B3',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 145),
  },
  {
    id: 'scroll-to-text-025',
    description: 'Fragment directive with all TextMatchChars should match text',
    fragment: "#:~:text=!$'()*+./:;=?@_~",
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 150),
  },
  {
    id: 'scroll-to-text-026',
    description: 'Multiple matching exact texts should match text',
    fragment: '#:~:text=this&text=test,page',
    outcome: {
      status: 'divergent',
      reason: 'the fragment carries several directives joined by an ampersand, and this grammar reads one directive per fragment',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 156),
  },
  {
    id: 'scroll-to-text-027',
    description: 'Multiple non-whole-word exact texts should not match',
    fragment: '#:~:text=tes&text=age',
    outcome: {
      status: 'divergent',
      reason: 'the fragment carries several directives joined by an ampersand, and this grammar reads one directive per fragment',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 161),
  },
  {
    id: 'scroll-to-text-028',
    description: 'A non-matching text directive followed by a matching text directive should match and scroll into view the second text directive',
    fragment: '#:~:text=none&text=test%20page',
    outcome: {
      status: 'divergent',
      reason: 'the fragment carries several directives joined by an ampersand, and this grammar reads one directive per fragment',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 166),
  },
  {
    id: 'scroll-to-text-029',
    description: 'Text directive followed by non-text directive should match text',
    fragment: '#:~:text=test%20page&directive',
    outcome: {
      status: 'divergent',
      reason: 'the fragment carries several directives joined by an ampersand, and this grammar reads one directive per fragment',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 171),
  },
  {
    id: 'scroll-to-text-030',
    description: 'Multiple text directives and a non-text directive should match text',
    fragment: '#:~:text=test&directive&text=page',
    outcome: {
      status: 'divergent',
      reason: 'the fragment carries several directives joined by an ampersand, and this grammar reads one directive per fragment',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 176),
  },
  {
    id: 'scroll-to-text-031',
    description: 'Text directive with existing element fragment should match and scroll into view text',
    fragment: '#element:~:text=test',
    outcome: {
      status: 'not-applicable',
      reason: 'the case pairs a text directive with an element fragment, and the corpus reads which element the browser lands on',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 182),
  },
  {
    id: 'scroll-to-text-032',
    description: 'Text directive with nonexistent element fragment should match and scroll into view text',
    fragment: '#pagestate:~:text=test',
    outcome: {
      status: 'not-applicable',
      reason: 'the case pairs a text directive with an element fragment, and the corpus reads which element the browser lands on',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 187),
  },
  {
    id: 'scroll-to-text-033',
    description: 'Non-matching text directive with existing element fragment should scroll to element',
    fragment: '#element:~:text=nomatch',
    outcome: {
      status: 'not-applicable',
      reason: 'the case pairs a text directive with an element fragment, and the corpus reads which element the browser lands on',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 192),
  },
  {
    id: 'scroll-to-text-034',
    description: 'Non-matching text directive with nonexistent element fragment should not match and not scroll',
    fragment: '#pagestate:~:text=nomatch',
    outcome: {
      status: 'not-applicable',
      reason: 'the case pairs a text directive with an element fragment, and the corpus reads which element the browser lands on',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 197),
  },
  {
    id: 'scroll-to-text-035',
    description: 'Multiple match text directive disambiguated by prefix should match the prefixed text',
    fragment: '#:~:text=more-,test%20page',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'more-text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 203),
  },
  {
    id: 'scroll-to-text-036',
    description: 'Multiple match text directive disambiguated by suffix should match the suffixed text',
    fragment: '#:~:text=test%20page,-text',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'more-text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 208),
  },
  {
    id: 'scroll-to-text-037',
    description: 'Multiple match text directive disambiguated by prefix and suffix should match the text with the given context',
    fragment: '#:~:text=more-,test%20page,-text',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'more-text' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 213),
  },
  {
    id: 'scroll-to-text-038',
    description: 'Text directive should match when context terms are separated by node boundaries',
    fragment: '#:~:text=prefix-,test%20page,-suffix',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'cross-node-context' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 219),
  },
  {
    id: 'scroll-to-text-039',
    description: 'Text directive should match text within shadow DOM',
    fragment: '#:~:text=shadow%20text',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'shadow' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 225),
  },
  {
    id: 'scroll-to-text-040',
    description: 'Text directive should not scroll to hidden text',
    fragment: '#:~:text=hidden%20text',
    outcome: {
      status: 'not-applicable',
      reason: 'the corpus reads a scroll position, and a position cannot tell a match the browser keeps out of view from a miss',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 233),
  },
  {
    id: 'scroll-to-text-041',
    description: 'Text directive should not scroll to display none text',
    fragment: '#:~:text=display%20none',
    outcome: {
      status: 'not-applicable',
      reason: 'the corpus reads a scroll position, and a position cannot tell a match the browser keeps out of view from a miss',
    },
    permalink: wptPermalink('scroll-to-text-fragment.html', 238),
  },
  {
    id: 'scroll-to-text-042',
    description: 'Text directive should horizontally scroll into view',
    fragment: '#:~:text=horizontally%20scrolled%20text',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'horizontal-scroll' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 244),
  },
  {
    id: 'scroll-to-text-043',
    description: 'Text directive should horizontally scroll into view within a wide line',
    fragment: '#:~:text=inline-horizontal-target',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'inline-horizontal-scroll' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 249),
  },
  {
    id: 'scroll-to-text-044',
    description: 'Text directive that spans a range larger than the viewport should scroll the start into view',
    fragment: '#:~:text=Element,This',
    outcome: { status: 'ported', expectation: { kind: 'match-in', block: 'element' } },
    permalink: wptPermalink('scroll-to-text-fragment.html', 254),
  },
];
