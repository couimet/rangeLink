import { DEFAULT_DELIMITERS } from '../../constants';
import { detectQuotedLinks } from '../../detection/detectQuotedLinks';
import { findLinksInText } from '../../detection/findLinksInText';
import type { OccupiedRange } from '../../detection/types';
import { RangeLinkError, RangeLinkErrorCodes } from '../../errors';
import { parseLink } from '../../parsing/parseLink';
import type { DetectedLink } from '../../types';
import { CoreResult } from '../../types/CoreResult';

import type { Logger } from '@couimet/logger-contract';
import { createMockLogger } from '@couimet/logger-contract-testing';

jest.mock('../../parsing/parseLink', () => ({
  ...jest.requireActual('../../parsing/parseLink'),
  parseLink: jest.fn(),
}));
const realParseLink = jest.requireActual<typeof import('../../parsing/parseLink')>('../../parsing/parseLink').parseLink;
const mockParseLink = parseLink as jest.MockedFunction<typeof parseLink>;

describe('findLinksInText', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
    mockParseLink.mockImplementation(realParseLink);
  });

  describe('unquoted links', () => {
    it('should detect a single unquoted link', () => {
      const results = findLinksInText('Check src/auth.ts#L10 for details', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'src/auth.ts#L10',
          startIndex: 6,
          length: 15,
          parsed: {
            path: 'src/auth.ts',
            quotedPath: 'src/auth.ts',
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });

    it('should detect multiple unquoted links', () => {
      const results = findLinksInText('See src/a.ts#L1 and src/b.ts#L2-L5', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'src/a.ts#L1',
          startIndex: 4,
          length: 11,
          parsed: {
            path: 'src/a.ts',
            quotedPath: 'src/a.ts',
            start: { line: 1 },
            end: { line: 1 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
        {
          linkText: 'src/b.ts#L2-L5',
          startIndex: 20,
          length: 14,
          parsed: {
            path: 'src/b.ts',
            quotedPath: 'src/b.ts',
            start: { line: 2 },
            end: { line: 5 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });

    it('should return empty array for text with no links', () => {
      const results = findLinksInText('No links here', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([]);
    });

    describe('surrounding punctuation trimming', () => {
      it('should strip leading and trailing parens from a matched link', () => {
        const results = findLinksInText('(path#L1-L2)', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'path#L1-L2',
            startIndex: 1,
            length: 10,
            parsed: {
              path: 'path',
              quotedPath: 'path',
              start: { line: 1 },
              end: { line: 2 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      it('should strip leading paren when link is followed by trailing punctuation', () => {
        const results = findLinksInText('(path#L1-L2):', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'path#L1-L2',
            startIndex: 1,
            length: 10,
            parsed: {
              path: 'path',
              quotedPath: 'path',
              start: { line: 1 },
              end: { line: 2 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      it('should not produce a link from bare punctuation with no valid path', () => {
        const results = findLinksInText('()', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([]);
      });

      it('should leave a clean path unchanged', () => {
        const results = findLinksInText('path#L1-L2', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'path#L1-L2',
            startIndex: 0,
            length: 10,
            parsed: {
              path: 'path',
              quotedPath: 'path',
              start: { line: 1 },
              end: { line: 2 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      describe('prefix-only (opening character without matching closer)', () => {
        it.each([
          ['( (opening paren)', '(path#L5', 1],
          ['[ (opening bracket)', '[path#L5', 1],
          ['{ (opening brace)', '{path#L5', 1],
          ['< (opening angle)', '<path#L5', 1],
          ['` (backtick)', '`path#L5', 1],
          ["' (single quote)", "'path#L5", 1],
          ['" (double quote)', '"path#L5', 1],
        ])('should detect link with prefix-only %s', (_label, text, expectedStartIndex) => {
          const results = findLinksInText(text, DEFAULT_DELIMITERS, logger);

          expect(results).toStrictEqual([
            {
              linkText: 'path#L5',
              startIndex: expectedStartIndex,
              length: 7,
              parsed: {
                path: 'path',
                quotedPath: 'path',
                start: { line: 5 },
                end: { line: 5 },
                linkType: 'regular',
                selectionType: 'Normal',
              },
            },
          ]);
        });
      });

      describe('suffix-only (closing character without matching opener)', () => {
        it.each([
          [') (closing paren)', 'path#L5)'],
          ['] (closing bracket)', 'path#L5]'],
          ['} (closing brace)', 'path#L5}'],
          ['> (closing angle)', 'path#L5>'],
          ['` (backtick)', 'path#L5`'],
          ["' (single quote)", "path#L5'"],
          ['" (double quote)', 'path#L5"'],
        ])('should detect link with suffix-only %s', (_label, text) => {
          const results = findLinksInText(text, DEFAULT_DELIMITERS, logger);

          expect(results).toStrictEqual([
            {
              linkText: 'path#L5',
              startIndex: 0,
              length: 7,
              parsed: {
                path: 'path',
                quotedPath: 'path',
                start: { line: 5 },
                end: { line: 5 },
                linkType: 'regular',
                selectionType: 'Normal',
              },
            },
          ]);
        });
      });

      describe('single wrapping char — no valid path', () => {
        it.each([
          ['bare opening paren', '('],
          ['bare closing paren', ')'],
          ['bare backtick', '`'],
          ['bare single quote', "'"],
          ['bare double quote', '"'],
          ['bare opening angle', '<'],
          ['bare closing angle', '>'],
        ])('should return empty when text is just %s', (_label, text) => {
          const results = findLinksInText(text, DEFAULT_DELIMITERS, logger);

          expect(results).toStrictEqual([]);
        });
      });
    });

    describe('markdown link syntax', () => {
      it('should detect the path from a simple markdown link', () => {
        const results = findLinksInText('[text](src/auth.ts#L10)', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'src/auth.ts#L10',
            startIndex: 7,
            length: 15,
            parsed: {
              path: 'src/auth.ts',
              quotedPath: 'src/auth.ts',
              start: { line: 10 },
              end: { line: 10 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      it('should detect the path from a simple markdown link embedded in prose', () => {
        const results = findLinksInText('See [text](src/auth.ts#L10) for details', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'src/auth.ts#L10',
            startIndex: 11,
            length: 15,
            parsed: {
              path: 'src/auth.ts',
              quotedPath: 'src/auth.ts',
              start: { line: 10 },
              end: { line: 10 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      it('should detect the correct link from a standalone backtick-labelled markdown link', () => {
        const results = findLinksInText(
          '[`RangeLinkService.ts:876`](packages/rangelink-vscode-extension/src/RangeLinkService.ts#L876)',
          DEFAULT_DELIMITERS,
          logger,
        );

        expect(results).toStrictEqual([
          {
            linkText: 'packages/rangelink-vscode-extension/src/RangeLinkService.ts#L876',
            startIndex: 28,
            length: 64,
            parsed: {
              path: 'packages/rangelink-vscode-extension/src/RangeLinkService.ts',
              quotedPath: 'packages/rangelink-vscode-extension/src/RangeLinkService.ts',
              start: { line: 876 },
              end: { line: 876 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      it('should detect the correct link from a backtick-labelled markdown link in prose (issue #379)', () => {
        const line =
          '2. `copyAndSendToDestination` at [`RangeLinkService.ts:876`](packages/rangelink-vscode-extension/src/RangeLinkService.ts#L876) — uses `isSelfPaste`';
        const results = findLinksInText(line, DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'packages/rangelink-vscode-extension/src/RangeLinkService.ts#L876',
            startIndex: 61,
            length: 64,
            parsed: {
              path: 'packages/rangelink-vscode-extension/src/RangeLinkService.ts',
              quotedPath: 'packages/rangelink-vscode-extension/src/RangeLinkService.ts',
              start: { line: 876 },
              end: { line: 876 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      it('should detect a range link inside a markdown link', () => {
        const results = findLinksInText('[text](src/auth.ts#L10-L20)', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'src/auth.ts#L10-L20',
            startIndex: 7,
            length: 19,
            parsed: {
              path: 'src/auth.ts',
              quotedPath: 'src/auth.ts',
              start: { line: 10 },
              end: { line: 20 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      it('should detect a range link inside a markdown link embedded in prose', () => {
        const results = findLinksInText('Check [text](src/auth.ts#L10-L20) above', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'src/auth.ts#L10-L20',
            startIndex: 13,
            length: 19,
            parsed: {
              path: 'src/auth.ts',
              quotedPath: 'src/auth.ts',
              start: { line: 10 },
              end: { line: 20 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });

      it('should detect both links when multiple markdown links appear in one line', () => {
        const results = findLinksInText('Compare [a](src/a.ts#L1) with [b](src/b.ts#L2)', DEFAULT_DELIMITERS, logger);

        expect(results).toStrictEqual([
          {
            linkText: 'src/a.ts#L1',
            startIndex: 12,
            length: 11,
            parsed: {
              path: 'src/a.ts',
              quotedPath: 'src/a.ts',
              start: { line: 1 },
              end: { line: 1 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
          {
            linkText: 'src/b.ts#L2',
            startIndex: 34,
            length: 11,
            parsed: {
              path: 'src/b.ts',
              quotedPath: 'src/b.ts',
              start: { line: 2 },
              end: { line: 2 },
              linkType: 'regular',
              selectionType: 'Normal',
            },
          },
        ]);
      });
    });
  });

  describe('quoted links', () => {
    it('should detect single-quoted links with spaces in paths', () => {
      const results = findLinksInText("Open 'My Folder/file.ts#L10' to see", DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'My Folder/file.ts#L10',
          startIndex: 5,
          length: 23,
          parsed: {
            path: 'My Folder/file.ts',
            quotedPath: "'My Folder/file.ts'",
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });

    it('should detect double-quoted links with spaces in paths', () => {
      const results = findLinksInText('"My Folder/file.ts#L10"', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'My Folder/file.ts#L10',
          startIndex: 0,
          length: 23,
          parsed: {
            path: 'My Folder/file.ts',
            quotedPath: "'My Folder/file.ts'",
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });

    it('should detect quoted links with column positions', () => {
      const results = findLinksInText("'Meslo Slashed/LICENSE.txt#L10C24-L11C24'", DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'Meslo Slashed/LICENSE.txt#L10C24-L11C24',
          startIndex: 0,
          length: 41,
          parsed: {
            path: 'Meslo Slashed/LICENSE.txt',
            quotedPath: "'Meslo Slashed/LICENSE.txt'",
            start: { line: 10, character: 24 },
            end: { line: 11, character: 24 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });

    it('should detect rectangular quoted links', () => {
      const results = findLinksInText("'My Dir/file.ts##L5C1-L7C8'", DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'My Dir/file.ts##L5C1-L7C8',
          startIndex: 0,
          length: 27,
          parsed: {
            path: 'My Dir/file.ts',
            quotedPath: "'My Dir/file.ts'",
            start: { line: 5, character: 1 },
            end: { line: 7, character: 8 },
            linkType: 'regular',
            selectionType: 'Rectangular',
          },
        },
      ]);
    });

    it('should skip quoted segments that are not valid links', () => {
      const results = findLinksInText("Some 'random text' and 'not a link' here", DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([]);
    });
  });

  describe('mixed unquoted and quoted links', () => {
    it('should detect both unquoted and quoted links in same text', () => {
      const results = findLinksInText("See src/a.ts#L1 and 'My Dir/b.ts#L5-L10'", DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'src/a.ts#L1',
          startIndex: 4,
          length: 11,
          parsed: {
            path: 'src/a.ts',
            quotedPath: 'src/a.ts',
            start: { line: 1 },
            end: { line: 1 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
        {
          linkText: 'My Dir/b.ts#L5-L10',
          startIndex: 20,
          length: 20,
          parsed: {
            path: 'My Dir/b.ts',
            quotedPath: "'My Dir/b.ts'",
            start: { line: 5 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });

    it('should detect both single- and double-quoted links in same text', () => {
      const results = findLinksInText(`Check 'My Dir/a.ts#L1' and "Other Dir/b.ts#L2"`, DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'My Dir/a.ts#L1',
          startIndex: 6,
          length: 16,
          parsed: {
            path: 'My Dir/a.ts',
            quotedPath: "'My Dir/a.ts'",
            start: { line: 1 },
            end: { line: 1 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
        {
          linkText: 'Other Dir/b.ts#L2',
          startIndex: 27,
          length: 19,
          parsed: {
            path: 'Other Dir/b.ts',
            quotedPath: "'Other Dir/b.ts'",
            start: { line: 2 },
            end: { line: 2 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });

    it('should replace partial unquoted match when quoted segment encompasses it', () => {
      const results = findLinksInText("Check 'src/file.ts#L10' here", DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'src/file.ts#L10',
          startIndex: 6,
          length: 17,
          parsed: {
            path: 'src/file.ts',
            quotedPath: 'src/file.ts',
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });
  });

  describe('cancellation', () => {
    it('should respect cancellation token during unquoted pass', () => {
      const token = { isCancellationRequested: true };
      const results = findLinksInText('src/a.ts#L1 and src/b.ts#L2', DEFAULT_DELIMITERS, logger, token);

      expect(results).toStrictEqual([]);
    });

    it('should respect cancellation token during quoted pass', () => {
      const token = { isCancellationRequested: true };
      const results = findLinksInText("'My Folder/file.ts#L10'", DEFAULT_DELIMITERS, logger, token);

      expect(results).toStrictEqual([]);
    });
  });

  describe('parse failures', () => {
    it('should skip regex matches that fail to parse and log the failure', () => {
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Bad format',
        functionName: 'parseLink',
      });
      mockParseLink.mockReturnValueOnce(CoreResult.err(mockError));

      const results = findLinksInText('Check src/auth.ts#L10 for details', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([]);
      expect(logger.debug).toHaveBeenCalledWith({ fn: 'detectUnquotedLinks', link: 'src/auth.ts#L10', error: mockError }, 'Skipping link that failed to parse');
    });

    it('should count parse failures in summary log', () => {
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Bad format',
        functionName: 'parseLink',
      });
      mockParseLink.mockReturnValueOnce(CoreResult.err(mockError));

      findLinksInText('Check src/auth.ts#L10 for details', DEFAULT_DELIMITERS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'findLinksInText',
          textLength: 33,
          unquotedMatches: 1,
          quotedCandidates: 0,
          quotedReplacements: 0,
          linksDetected: 0,
          parseFailures: 1,
          textFragmentCandidates: 0,
          textFragmentParseFailures: 0,
          quotedParseFailures: 0,
        },
        'Link detection complete',
      );
    });
  });

  describe('logging', () => {
    it('should log summary when links are detected', () => {
      findLinksInText('Check src/auth.ts#L10 for details', DEFAULT_DELIMITERS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'findLinksInText',
          textLength: 33,
          unquotedMatches: 1,
          quotedCandidates: 0,
          quotedReplacements: 0,
          linksDetected: 1,
          parseFailures: 0,
          textFragmentCandidates: 0,
          textFragmentParseFailures: 0,
          quotedParseFailures: 0,
        },
        'Link detection complete',
      );
    });

    it('should not log when no links and no failures', () => {
      findLinksInText('No links here', DEFAULT_DELIMITERS, logger);

      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should log summary when only quoted candidates examined (no detected links)', () => {
      findLinksInText("Some 'random text' and 'not a link' here", DEFAULT_DELIMITERS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'findLinksInText',
          textLength: 40,
          unquotedMatches: 0,
          quotedCandidates: 2,
          quotedReplacements: 0,
          linksDetected: 0,
          parseFailures: 0,
          textFragmentCandidates: 0,
          textFragmentParseFailures: 0,
          quotedParseFailures: 2,
        },
        'Link detection complete',
      );
    });

    it('should log quoted stats when quoted link detected with replacement', () => {
      findLinksInText("Open 'My Folder/file.ts#L10' to see", DEFAULT_DELIMITERS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'findLinksInText',
          textLength: 35,
          unquotedMatches: 1,
          quotedCandidates: 1,
          quotedReplacements: 1,
          linksDetected: 1,
          parseFailures: 0,
          textFragmentCandidates: 0,
          textFragmentParseFailures: 0,
          quotedParseFailures: 0,
        },
        'Link detection complete',
      );
    });

    it('should log replacement when quoted link replaces encompassed unquoted match', () => {
      findLinksInText("Check 'src/file.ts#L10' here", DEFAULT_DELIMITERS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'detectQuotedLinks', linkText: 'src/file.ts#L10', replacedCount: 1 },
        'Quoted link replaced encompassed unquoted match(es)',
      );

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'findLinksInText',
          textLength: 28,
          unquotedMatches: 1,
          quotedCandidates: 1,
          quotedReplacements: 1,
          linksDetected: 1,
          parseFailures: 0,
          textFragmentCandidates: 0,
          textFragmentParseFailures: 0,
          quotedParseFailures: 0,
        },
        'Link detection complete',
      );
    });
  });

  describe('detectQuotedLinks overlap handling', () => {
    it('should skip quoted link when it partially overlaps an unquoted match', () => {
      // "prefix'src/file.ts#L10'"
      //  ^0    ^6              ^23
      // Quoted segment spans [6, 24). Occupied range [0, 18) starts before the
      // quoted segment and ends inside it — not fully encompassed, so partial.
      const text = "prefix'src/file.ts#L10'";
      const links: DetectedLink[] = [];
      const occupiedRanges: OccupiedRange[] = [{ start: 0, end: 18 }];

      const result = detectQuotedLinks(text, links, occupiedRanges, DEFAULT_DELIMITERS, logger);

      expect(result).toStrictEqual({ quotedCandidates: 1, quotedReplacements: 0, quotedParseFailures: 0 });
      expect(links).toStrictEqual([]);
    });
  });

  describe('text fragment links and numeric coexistence', () => {
    it('should detect a text fragment link as a parsed text fragment', () => {
      const results = findLinksInText('src/a.ts:~:text=foo', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'src/a.ts:~:text=foo',
          startIndex: 0,
          length: 19,
          parsed: { path: 'src/a.ts', directive: { start: 'foo' } },
        },
      ]);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'findLinksInText',
          textLength: 19,
          textFragmentCandidates: 1,
          unquotedMatches: 0,
          quotedCandidates: 0,
          quotedReplacements: 0,
          linksDetected: 1,
          parseFailures: 0,
          textFragmentParseFailures: 0,
          quotedParseFailures: 0,
        },
        'Link detection complete',
      );
    });

    it('should not turn the path prefix of a text fragment link into a numeric link', () => {
      const results = findLinksInText('Check src/a.ts:~:text=foo for the method', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'src/a.ts:~:text=foo',
          startIndex: 6,
          length: 19,
          parsed: { path: 'src/a.ts', directive: { start: 'foo' } },
        },
      ]);
    });

    it('should still detect a numeric link next to a text fragment link', () => {
      const results = findLinksInText('See src/a.ts#L10 and src/b.ts:~:text=value', DEFAULT_DELIMITERS, logger);

      // The text fragment pass runs before the unquoted pass, so the fragment link comes first.
      expect(results).toStrictEqual([
        {
          linkText: 'src/b.ts:~:text=value',
          startIndex: 21,
          length: 21,
          parsed: { path: 'src/b.ts', directive: { start: 'value' } },
        },
        {
          linkText: 'src/a.ts#L10',
          startIndex: 4,
          length: 12,
          parsed: {
            path: 'src/a.ts',
            quotedPath: 'src/a.ts',
            start: { line: 10 },
            end: { line: 10 },
            linkType: 'regular',
            selectionType: 'Normal',
          },
        },
      ]);
    });

    it('should skip a numeric match that would otherwise form inside a text fragment value', () => {
      // `foo#L10` looks like a numeric RangeLink to the unquoted pass, but the
      // text fragment pass has already claimed the span, so only the text link survives.
      const results = findLinksInText('src/a.ts:~:text=foo#L10', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([
        {
          linkText: 'src/a.ts:~:text=foo',
          startIndex: 0,
          length: 19,
          parsed: { path: 'src/a.ts', directive: { start: 'foo' } },
        },
      ]);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'findLinksInText',
          textLength: 23,
          textFragmentCandidates: 1,
          unquotedMatches: 1,
          quotedCandidates: 0,
          quotedReplacements: 0,
          linksDetected: 1,
          parseFailures: 0,
          textFragmentParseFailures: 0,
          quotedParseFailures: 0,
        },
        'Link detection complete',
      );
    });

    it('should count and log a text fragment link that fails to parse', () => {
      // Three middle terms — the codec rejects any structure that is not
      // [prefix-,]start[,end][,-suffix]. A stray percent sign would not fail:
      // the codec reads it as literal text, matching the browser.
      const results = findLinksInText('See src/a.ts:~:text=foo,,bar here', DEFAULT_DELIMITERS, logger);

      expect(results).toStrictEqual([]);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'findLinksInText',
          textLength: 33,
          textFragmentCandidates: 1,
          unquotedMatches: 0,
          quotedCandidates: 0,
          quotedReplacements: 0,
          linksDetected: 0,
          parseFailures: 0,
          textFragmentParseFailures: 1,
          quotedParseFailures: 0,
        },
        'Link detection complete',
      );
    });
  });
});
