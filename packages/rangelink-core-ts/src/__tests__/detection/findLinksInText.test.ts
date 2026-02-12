import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { DEFAULT_DELIMITERS } from '../../constants';
import { findLinksInText } from '../../detection/findLinksInText';
import { RangeLinkError, RangeLinkErrorCodes } from '../../errors';
import { parseLink } from '../../parsing/parseLink';
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

      const debugCalls = (logger.debug as jest.Mock).mock.calls;
      const detectionCalls = debugCalls.filter((call) => call[1] === 'Link detection complete');
      expect(detectionCalls).toHaveLength(0);
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
});
