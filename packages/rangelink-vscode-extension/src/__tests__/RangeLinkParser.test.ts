import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS, LinkType, SelectionType } from 'rangelink-core-ts';
import type { ParsedLink } from 'rangelink-core-ts';

import { RangeLinkParser } from '../RangeLinkParser';
import * as formatLinkTooltipModule from '../utils/formatLinkTooltip';

describe('RangeLinkParser', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let parser: RangeLinkParser;

  beforeEach(() => {
    mockLogger = createMockLogger();
    parser = new RangeLinkParser(DEFAULT_DELIMITERS, mockLogger);
  });

  describe('constructor', () => {
    it('logs initialization with delimiter config', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkParser.constructor', delimiters: DEFAULT_DELIMITERS },
        'RangeLinkParser initialized',
      );
    });
  });

  describe('getPattern', () => {
    it('returns compiled RegExp pattern', () => {
      const pattern = parser.getPattern();

      expect(pattern).toBeInstanceOf(RegExp);
      expect(pattern.global).toBe(true);
    });

    it('returns pattern that matches RangeLink formats', () => {
      const pattern = parser.getPattern();

      expect('file.ts#L10').toMatch(pattern);
      expect('file.ts#L10-L20').toMatch(pattern);
      expect('file.ts#L10C5-L20C10').toMatch(pattern);
      expect('file.ts##L10C5-L20C10').toMatch(pattern);
    });

    it('returns same pattern instance on repeated calls', () => {
      const pattern1 = parser.getPattern();
      const pattern2 = parser.getPattern();

      expect(pattern1).toBe(pattern2);
    });
  });

  describe('parseLink', () => {
    it('parses single-line link', () => {
      const result = parser.parseLink('file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('parses multi-line range', () => {
      const result = parser.parseLink('src/foo.ts#L10-L20');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'src/foo.ts',
          start: { line: 10 },
          end: { line: 20 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('parses link with column positions', () => {
      const result = parser.parseLink('file.ts#L10C5-L20C15');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file.ts',
          start: { line: 10, char: 5 },
          end: { line: 20, char: 15 },
          linkType: 'regular',
          selectionType: 'Normal',
        });
      });
    });

    it('parses rectangular selection (double hash)', () => {
      const result = parser.parseLink('file.ts##L10C5-L20C10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value).toStrictEqual({
          path: 'file.ts',
          start: { line: 10, char: 5 },
          end: { line: 20, char: 10 },
          linkType: 'regular',
          selectionType: 'Rectangular',
        });
      });
    });

    it('returns error for invalid link without hash separator', () => {
      const result = parser.parseLink('invalid');

      expect(result).toBeRangeLinkErrorErr('PARSE_NO_HASH_SEPARATOR', {
        message: 'Link must contain # separator',
        functionName: 'parseLink',
      });
    });

    it('returns error for link with invalid range format', () => {
      const result = parser.parseLink('file.ts#X10');

      expect(result).toBeRangeLinkErrorErr('PARSE_INVALID_RANGE_FORMAT', {
        message: 'Invalid range format',
        functionName: 'parseLink',
      });
    });
  });

  describe('formatTooltip', () => {
    it('delegates to formatLinkTooltip utility', () => {
      const parsed: ParsedLink = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const expectedTooltip = 'Open file.ts:10 • RangeLink';

      const formatLinkTooltipSpy = jest
        .spyOn(formatLinkTooltipModule, 'formatLinkTooltip')
        .mockReturnValue(expectedTooltip);

      const result = parser.formatTooltip(parsed);

      expect(formatLinkTooltipSpy).toHaveBeenCalledTimes(1);
      expect(formatLinkTooltipSpy).toHaveBeenCalledWith(parsed);
      expect(result).toBe(expectedTooltip);
    });

    it('passes through undefined from formatLinkTooltip', () => {
      const parsed = {
        path: '',
        start: { line: 10 },
        end: { line: 10 },
      } as ParsedLink;

      jest.spyOn(formatLinkTooltipModule, 'formatLinkTooltip').mockReturnValue(undefined);

      const result = parser.formatTooltip(parsed);

      expect(result).toBeUndefined();
    });
  });
});
