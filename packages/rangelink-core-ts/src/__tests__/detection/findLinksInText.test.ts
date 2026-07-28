import type { Logger } from '@couimet/logger-contract';
import { createMockLogger } from '@couimet/logger-contract-testing';

import { DEFAULT_DELIMITERS } from '../../constants';
import { detectQuotedLinks } from '../../detection/detectQuotedLinks';
import { findLinksInText } from '../../detection/findLinksInText';
import type { OccupiedRange } from '../../detection/types';
import { RangeLinkError, RangeLinkErrorCodes } from '../../errors';
import { parseLink } from '../../parsing/parseLink';
import type { DetectedLink } from '../../types';
import { Result } from '../../types/Result';

jest.mock('../../parsing/parseLink', () => ({
  ...jest.requireActual('../../parsing/parseLink'),
  parseLink: jest.fn(),
}));
const realParseLink =
  jest.requireActual<typeof import('../../parsing/parseLink')>('../../parsing/parseLink').parseLink;
const mockParseLink = parseLink as jest.MockedFunction<typeof parseLink>;

describe('findLinksInText', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
    mockParseLink.mockImplementation(realParseLink);
  });

  describe('unquoted links', () => {
    it('should detect a single unquoted link', () => {
      const results = findLinksInText(
        'Check src/auth.ts#L10 for details',
        DEFAULT_DELIMITERS,
        logger,
      );

      expect(results).toHaveLength(1);
      expect(results[0].linkText).toBe('src/auth.ts#L10');
      expect(results[0].startIndex).toBe(6);
      expect(results[0].length).toBe(15);
      expect(results[0].parsed.path).toBe('src/auth.ts');
      expect(results[0].parsed.start.line).toBe(10);
    });

    it('should detect multiple unquoted links', () => {
      const results = findLinksInText(
        'See src/a.ts#L1 and src/b.ts#L2-L5',
        DEFAULT_DELIMITERS,
        logger,
      );

      expect(results).toHaveLength(2);
      expect(results[0].linkText).toBe('src/a.ts#L1');
      expect(results[1].linkText).toBe('src/b.ts#L2-L5');
    });

    it('should return empty array for text with no links', () => {
      const results = findLinksInText('No links here', DEFAULT_DELIMITERS, logger);

      expect(results).toHaveLength(0);
    });

    describe('surrounding punctuation trimming', () => {
      it('should strip leading and trailing parens from a matched link', () => {
        const results = findLinksInText('(path#L1-L2)', DEFAULT_DELIMITERS, logger);

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe('path#L1-L2');
        expect(results[0].startIndex).toBe(1);
        expect(results[0].length).toBe(10);
        expect(results[0].parsed.path).toBe('path');
        expect(results[0].parsed.start.line).toBe(1);
        expect(results[0].parsed.end.line).toBe(2);
      });

      it('should strip leading paren when link is followed by trailing punctuation', () => {
        const results = findLinksInText('(path#L1-L2):', DEFAULT_DELIMITERS, logger);

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe('path#L1-L2');
        expect(results[0].startIndex).toBe(1);
        expect(results[0].length).toBe(10);
        expect(results[0].parsed.path).toBe('path');
        expect(results[0].parsed.start.line).toBe(1);
        expect(results[0].parsed.end.line).toBe(2);
      });

      it('should not produce a link from bare punctuation with no valid path', () => {
        const results = findLinksInText('()', DEFAULT_DELIMITERS, logger);

        expect(results).toHaveLength(0);
      });

      it('should leave a clean path unchanged', () => {
        const results = findLinksInText('path#L1-L2', DEFAULT_DELIMITERS, logger);

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe('path#L1-L2');
        expect(results[0].startIndex).toBe(0);
        expect(results[0].length).toBe(10);
        expect(results[0].parsed.path).toBe('path');
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

          expect(results).toHaveLength(1);
          expect(results[0].linkText).toBe('path#L5');
          expect(results[0].startIndex).toBe(expectedStartIndex);
          expect(results[0].parsed.path).toBe('path');
          expect(results[0].parsed.start.line).toBe(5);
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

          expect(results).toHaveLength(1);
          expect(results[0].linkText).toBe('path#L5');
          expect(results[0].startIndex).toBe(0);
          expect(results[0].parsed.path).toBe('path');
          expect(results[0].parsed.start.line).toBe(5);
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

          expect(results).toHaveLength(0);
        });
      });
    });

    describe('markdown link syntax', () => {
      it('should detect the path from a simple markdown link', () => {
        const results = findLinksInText('[text](src/auth.ts#L10)', DEFAULT_DELIMITERS, logger);

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe('src/auth.ts#L10');
        expect(results[0].parsed.path).toBe('src/auth.ts');
        expect(results[0].parsed.start.line).toBe(10);
      });

      it('should detect the path from a simple markdown link embedded in prose', () => {
        const results = findLinksInText(
          'See [text](src/auth.ts#L10) for details',
          DEFAULT_DELIMITERS,
          logger,
        );

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe('src/auth.ts#L10');
        expect(results[0].parsed.path).toBe('src/auth.ts');
        expect(results[0].parsed.start.line).toBe(10);
      });

      it('should detect the correct link from a standalone backtick-labelled markdown link', () => {
        const results = findLinksInText(
          '[`RangeLinkService.ts:876`](packages/rangelink-vscode-extension/src/RangeLinkService.ts#L876)',
          DEFAULT_DELIMITERS,
          logger,
        );

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe(
          'packages/rangelink-vscode-extension/src/RangeLinkService.ts#L876',
        );
        expect(results[0].parsed.path).toBe(
          'packages/rangelink-vscode-extension/src/RangeLinkService.ts',
        );
        expect(results[0].parsed.start.line).toBe(876);
      });

      it('should detect the correct link from a backtick-labelled markdown link in prose (issue #379)', () => {
        const line =
          '2. `copyAndSendToDestination` at [`RangeLinkService.ts:876`](packages/rangelink-vscode-extension/src/RangeLinkService.ts#L876) — uses `isSelfPaste`';
        const results = findLinksInText(line, DEFAULT_DELIMITERS, logger);

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe(
          'packages/rangelink-vscode-extension/src/RangeLinkService.ts#L876',
        );
        expect(results[0].parsed.path).toBe(
          'packages/rangelink-vscode-extension/src/RangeLinkService.ts',
        );
        expect(results[0].parsed.start.line).toBe(876);
      });

      it('should detect a range link inside a markdown link', () => {
        const results = findLinksInText('[text](src/auth.ts#L10-L20)', DEFAULT_DELIMITERS, logger);

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe('src/auth.ts#L10-L20');
        expect(results[0].parsed.path).toBe('src/auth.ts');
        expect(results[0].parsed.start.line).toBe(10);
        expect(results[0].parsed.end.line).toBe(20);
      });

      it('should detect a range link inside a markdown link embedded in prose', () => {
        const results = findLinksInText(
          'Check [text](src/auth.ts#L10-L20) above',
          DEFAULT_DELIMITERS,
          logger,
        );

        expect(results).toHaveLength(1);
        expect(results[0].linkText).toBe('src/auth.ts#L10-L20');
        expect(results[0].parsed.path).toBe('src/auth.ts');
        expect(results[0].parsed.start.line).toBe(10);
        expect(results[0].parsed.end.line).toBe(20);
      });

      it('should detect both links when multiple markdown links appear in one line', () => {
        const results = findLinksInText(
          'Compare [a](src/a.ts#L1) with [b](src/b.ts#L2)',
          DEFAULT_DELIMITERS,
          logger,
        );

        expect(results).toHaveLength(2);
        expect(results[0].linkText).toBe('src/a.ts#L1');
        expect(results[0].parsed.path).toBe('src/a.ts');
        expect(results[1].linkText).toBe('src/b.ts#L2');
        expect(results[1].parsed.path).toBe('src/b.ts');
      });
    });
  });

  describe('quoted links', () => {
    it('should detect single-quoted links with spaces in paths', () => {
      const results = findLinksInText(
        "Open 'My Folder/file.ts#L10' to see",
        DEFAULT_DELIMITERS,
        logger,
      );

      expect(results).toHaveLength(1);
      expect(results[0].linkText).toBe('My Folder/file.ts#L10');
      expect(results[0].startIndex).toBe(5);
      expect(results[0].length).toBe(23);
      expect(results[0].parsed.path).toBe('My Folder/file.ts');
      expect(results[0].parsed.start.line).toBe(10);
    });

    it('should detect double-quoted links with spaces in paths', () => {
      const results = findLinksInText('"My Folder/file.ts#L10"', DEFAULT_DELIMITERS, logger);

      expect(results).toHaveLength(1);
      expect(results[0].linkText).toBe('My Folder/file.ts#L10');
      expect(results[0].parsed.path).toBe('My Folder/file.ts');
    });

    it('should detect quoted links with column positions', () => {
      const results = findLinksInText(
        "'Meslo Slashed/LICENSE.txt#L10C24-L11C24'",
        DEFAULT_DELIMITERS,
        logger,
      );

      expect(results).toHaveLength(1);
      expect(results[0].linkText).toBe('Meslo Slashed/LICENSE.txt#L10C24-L11C24');
      expect(results[0].parsed.path).toBe('Meslo Slashed/LICENSE.txt');
      expect(results[0].parsed.start.line).toBe(10);
      expect(results[0].parsed.start.character).toBe(24);
      expect(results[0].parsed.end.line).toBe(11);
      expect(results[0].parsed.end.character).toBe(24);
    });

    it('should detect rectangular quoted links', () => {
      const results = findLinksInText("'My Dir/file.ts##L5C1-L7C8'", DEFAULT_DELIMITERS, logger);

      expect(results).toHaveLength(1);
      expect(results[0].linkText).toBe('My Dir/file.ts##L5C1-L7C8');
      expect(results[0].parsed.path).toBe('My Dir/file.ts');
      expect(results[0].parsed.selectionType).toBe('Rectangular');
    });

    it('should skip quoted segments that are not valid links', () => {
      const results = findLinksInText(
        "Some 'random text' and 'not a link' here",
        DEFAULT_DELIMITERS,
        logger,
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('mixed unquoted and quoted links', () => {
    it('should detect both unquoted and quoted links in same text', () => {
      const results = findLinksInText(
        "See src/a.ts#L1 and 'My Dir/b.ts#L5-L10'",
        DEFAULT_DELIMITERS,
        logger,
      );

      expect(results).toHaveLength(2);
      expect(results[0].linkText).toBe('src/a.ts#L1');
      expect(results[1].linkText).toBe('My Dir/b.ts#L5-L10');
    });

    it('should detect both single- and double-quoted links in same text', () => {
      const results = findLinksInText(
        `Check 'My Dir/a.ts#L1' and "Other Dir/b.ts#L2"`,
        DEFAULT_DELIMITERS,
        logger,
      );

      expect(results).toHaveLength(2);
      expect(results[0].linkText).toBe('My Dir/a.ts#L1');
      expect(results[1].linkText).toBe('Other Dir/b.ts#L2');
    });

    it('should replace partial unquoted match when quoted segment encompasses it', () => {
      const results = findLinksInText("Check 'src/file.ts#L10' here", DEFAULT_DELIMITERS, logger);

      expect(results).toHaveLength(1);
      expect(results[0].linkText).toBe('src/file.ts#L10');
      expect(results[0].startIndex).toBe(6);
      expect(results[0].length).toBe(17);
    });
  });

  describe('cancellation', () => {
    it('should respect cancellation token during unquoted pass', () => {
      const token = { isCancellationRequested: true };
      const results = findLinksInText(
        'src/a.ts#L1 and src/b.ts#L2',
        DEFAULT_DELIMITERS,
        logger,
        token,
      );

      expect(results).toHaveLength(0);
    });

    it('should respect cancellation token during quoted pass', () => {
      const token = { isCancellationRequested: true };
      const results = findLinksInText("'My Folder/file.ts#L10'", DEFAULT_DELIMITERS, logger, token);

      expect(results).toHaveLength(0);
    });
  });

  describe('parse failures', () => {
    it('should skip regex matches that fail to parse and log the failure', () => {
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Bad format',
        functionName: 'parseLink',
      });
      mockParseLink.mockReturnValueOnce(Result.err(mockError));

      const results = findLinksInText(
        'Check src/auth.ts#L10 for details',
        DEFAULT_DELIMITERS,
        logger,
      );

      expect(results).toHaveLength(0);
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'detectUnquotedLinks', link: 'src/auth.ts#L10', error: mockError },
        'Skipping link that failed to parse',
      );
    });

    it('should count parse failures in summary log', () => {
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Bad format',
        functionName: 'parseLink',
      });
      mockParseLink.mockReturnValueOnce(Result.err(mockError));

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

      expect(result.quotedCandidates).toBe(1);
      expect(result.quotedReplacements).toBe(0);
      expect(links).toHaveLength(0);
    });
  });
});
