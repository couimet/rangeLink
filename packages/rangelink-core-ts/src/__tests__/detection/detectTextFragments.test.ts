import { detectTextFragments } from '../../detection/detectTextFragments';

import type { Logger } from '@couimet/logger-contract';
import { createMockLogger } from '@couimet/logger-contract-testing';
import { parseTextFragment, TextFragmentError, TextFragmentErrorCodes, TextFragmentResult } from 'text-fragment-ts';

jest.mock('text-fragment-ts', () => ({
  ...jest.requireActual('text-fragment-ts'),
  parseTextFragment: jest.fn(),
}));
const realParseTextFragment = jest.requireActual<typeof import('text-fragment-ts')>('text-fragment-ts').parseTextFragment;
const mockParseTextFragment = parseTextFragment as jest.MockedFunction<typeof parseTextFragment>;

describe('detectTextFragments', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
    mockParseTextFragment.mockImplementation(realParseTextFragment);
  });

  it('should detect a single start-only text fragment link with offsets', () => {
    const result = detectTextFragments('Refer to src/file.ts:~:text=buildAll for details', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/file.ts:~:text=buildAll',
          startIndex: 9,
          length: 27,
          parsed: { path: 'src/file.ts', directive: { start: 'buildAll' } },
        },
      ],
      occupiedRanges: [{ start: 9, end: 36 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should detect a range directive spanning a comma-separated value', () => {
    const result = detectTextFragments('src/file.ts:~:text=const%20-,value', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/file.ts:~:text=const%20-,value',
          startIndex: 0,
          length: 34,
          parsed: { path: 'src/file.ts', directive: { prefix: 'const ', start: 'value' } },
        },
      ],
      occupiedRanges: [{ start: 0, end: 34 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should detect multiple text fragment links on one line', () => {
    const result = detectTextFragments('src/a.ts:~:text=one src/b.ts:~:text=two', logger);

    expect(result.links.map((link) => link.linkText)).toStrictEqual(['src/a.ts:~:text=one', 'src/b.ts:~:text=two']);
    expect(result.textFragmentCandidates).toBe(2);
  });

  it('should trim a leading wrapper character from the link text', () => {
    const result = detectTextFragments('{src/a.ts:~:text=foo}', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=foo',
          startIndex: 1,
          length: 19,
          parsed: { path: 'src/a.ts', directive: { start: 'foo' } },
        },
      ],
      occupiedRanges: [{ start: 1, end: 20 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should trim a trailing closing paren that prose put around the link', () => {
    const result = detectTextFragments('See (src/a.ts:~:text=foo)', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=foo',
          startIndex: 5,
          length: 19,
          parsed: { path: 'src/a.ts', directive: { start: 'foo' } },
        },
      ],
      occupiedRanges: [{ start: 5, end: 24 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should keep parens that balance inside a term', () => {
    const result = detectTextFragments('See src/a.ts:~:text=foo(bar)', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=foo(bar)',
          startIndex: 4,
          length: 24,
          parsed: { path: 'src/a.ts', directive: { start: 'foo(bar)' } },
        },
      ],
      occupiedRanges: [{ start: 4, end: 28 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should trim a sentence period that follows the link', () => {
    const result = detectTextFragments('See src/a.ts:~:text=foo.', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=foo',
          startIndex: 4,
          length: 19,
          parsed: { path: 'src/a.ts', directive: { start: 'foo' } },
        },
      ],
      occupiedRanges: [{ start: 4, end: 23 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should detect a link that a trailing comma used to make unparseable', () => {
    const result = detectTextFragments('See src/a.ts:~:text=foo, then stop', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=foo',
          startIndex: 4,
          length: 19,
          parsed: { path: 'src/a.ts', directive: { start: 'foo' } },
        },
      ],
      occupiedRanges: [{ start: 4, end: 23 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should keep a comma that separates the start and end terms', () => {
    const result = detectTextFragments('See src/a.ts:~:text=foo,bar', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=foo,bar',
          startIndex: 4,
          length: 23,
          parsed: { path: 'src/a.ts', directive: { start: 'foo', end: 'bar' } },
        },
      ],
      occupiedRanges: [{ start: 4, end: 27 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should detect a single-quoted text fragment link whose path holds a space', () => {
    const result = detectTextFragments("Open 'My Folder/file.ts:~:text=build' now", logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'My Folder/file.ts:~:text=build',
          startIndex: 5,
          length: 32,
          parsed: { path: 'My Folder/file.ts', directive: { start: 'build' } },
        },
      ],
      occupiedRanges: [{ start: 5, end: 37 }],
      textFragmentCandidates: 2,
      parseFailures: 0,
    });
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'detectTextFragments', link: "Folder/file.ts:~:text=build'" },
      'Skipping candidate already claimed by a quoted text fragment link',
    );
  });

  it('should detect a double-quoted text fragment link whose path holds a space', () => {
    const result = detectTextFragments('Open "My Folder/file.ts:~:text=build" now', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'My Folder/file.ts:~:text=build',
          startIndex: 5,
          length: 32,
          parsed: { path: 'My Folder/file.ts', directive: { start: 'build' } },
        },
      ],
      occupiedRanges: [{ start: 5, end: 37 }],
      textFragmentCandidates: 2,
      parseFailures: 0,
    });
  });

  it('should keep the closing quote out of a quoted link whose path holds no space', () => {
    const result = detectTextFragments("See 'src/a.ts:~:text=build' now", logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=build',
          startIndex: 4,
          length: 23,
          parsed: { path: 'src/a.ts', directive: { start: 'build' } },
        },
      ],
      occupiedRanges: [{ start: 4, end: 27 }],
      textFragmentCandidates: 2,
      parseFailures: 0,
    });
  });

  it('should not match a quoted segment that holds the marker but no link', () => {
    const result = detectTextFragments("See 'the :~:text= marker' here", logger);

    expect(result).toStrictEqual({ links: [], occupiedRanges: [], textFragmentCandidates: 0, parseFailures: 0 });
  });

  it('should not pair an apostrophe pair in prose into a fragment candidate', () => {
    const result = detectTextFragments("Don't break src/a.ts:~:text=foo now", logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=foo',
          startIndex: 12,
          length: 19,
          parsed: { path: 'src/a.ts', directive: { start: 'foo' } },
        },
      ],
      occupiedRanges: [{ start: 12, end: 31 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should keep a directive value that is itself punctuation', () => {
    const result = detectTextFragments('See src/a.ts:~:text=.', logger);

    expect(result).toStrictEqual({
      links: [
        {
          linkText: 'src/a.ts:~:text=.',
          startIndex: 4,
          length: 17,
          parsed: { path: 'src/a.ts', directive: { start: '.' } },
        },
      ],
      occupiedRanges: [{ start: 4, end: 21 }],
      textFragmentCandidates: 1,
      parseFailures: 0,
    });
  });

  it('should return empty when no text fragment link is present', () => {
    const result = detectTextFragments('No links here', logger);

    expect(result).toStrictEqual({ links: [], occupiedRanges: [], textFragmentCandidates: 0, parseFailures: 0 });
  });

  it('should not match a text fragment marker inside a web URL', () => {
    const result = detectTextFragments('Check https://example.com/path.ts:~:text=foo', logger);

    expect(result).toStrictEqual({ links: [], occupiedRanges: [], textFragmentCandidates: 0, parseFailures: 0 });
  });

  it('should skip candidates that fail to parse and log the failure', () => {
    const mockError = new TextFragmentError({
      code: TextFragmentErrorCodes.PARSE_TEXT_FRAGMENT_BAD_STRUCTURE,
      message: 'Invalid text directive structure - expected [prefix-,]start[,end][,-suffix]',
      functionName: 'parseTextFragment',
      details: { termCount: 3 },
    });
    mockParseTextFragment.mockReturnValueOnce(TextFragmentResult.err(mockError));

    const result = detectTextFragments('src/a.ts:~:text=foo,,bar', logger);

    expect(result).toStrictEqual({ links: [], occupiedRanges: [], textFragmentCandidates: 1, parseFailures: 1 });
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'detectTextFragments', link: 'src/a.ts:~:text=foo,,bar', error: mockError },
      'Skipping text fragment link that failed to parse',
    );
  });

  it('should respect a cancelled token before parsing candidates', () => {
    const token = { isCancellationRequested: true };
    const result = detectTextFragments('src/a.ts:~:text=foo', logger, token);

    expect(result).toStrictEqual({ links: [], occupiedRanges: [], textFragmentCandidates: 1, parseFailures: 0 });
  });

  it('should respect a cancelled token before parsing quoted candidates', () => {
    const token = { isCancellationRequested: true };
    const result = detectTextFragments("See 'src/a.ts:~:text=build' now", logger, token);

    expect(result).toStrictEqual({ links: [], occupiedRanges: [], textFragmentCandidates: 2, parseFailures: 0 });
  });
});
