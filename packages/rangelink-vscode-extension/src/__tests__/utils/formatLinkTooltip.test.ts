import type { ParsedLink } from 'rangelink-core-ts';
import { LinkType, SelectionType } from 'rangelink-core-ts';

import { formatLinkTooltip } from '../../utils';

describe('formatLinkTooltip', () => {
  describe('Parse success with line and character', () => {
    it('should format tooltip with path, line, and character', () => {
      const parsed: ParsedLink = {
        path: 'src/auth.ts',
        start: { line: 42, character: 10 },
        end: { line: 42, character: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open src/auth.ts:42:10 • RangeLink');
    });

    it('should format tooltip with different path and position', () => {
      const parsed: ParsedLink = {
        path: 'src/validation.ts',
        start: { line: 10, character: 5 },
        end: { line: 10, character: 5 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open src/validation.ts:10:5 • RangeLink');
    });
  });

  describe('Parse success with line only (no character)', () => {
    it('should format tooltip with path and line range', () => {
      const parsed: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 10 },
        end: { line: 20 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open src/file.ts:10-20 • RangeLink');
    });

    it('should format tooltip with path and single line', () => {
      const parsed: ParsedLink = {
        path: 'README.md',
        start: { line: 1 },
        end: { line: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open README.md:1 • RangeLink');
    });
  });

  describe('Range selection (value prop)', () => {
    it('should show full range to highlight RangeLink value prop', () => {
      const parsed: ParsedLink = {
        path: 'src/auth.ts',
        start: { line: 10, character: 5 },
        end: { line: 25, character: 30 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      // Shows the FULL range - this is RangeLink's value prop!
      expect(formatLinkTooltip(parsed)).toStrictEqual('Open src/auth.ts:10:5-25:30 • RangeLink');
    });
  });

  describe('Rectangular selection mode', () => {
    it('should format tooltip for rectangular selection showing full range', () => {
      const parsed: ParsedLink = {
        path: 'data.csv',
        start: { line: 10, character: 5 },
        end: { line: 20, character: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Rectangular,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open data.csv:10:5-20:10 • RangeLink');
    });
  });

  describe('Various file paths', () => {
    it('should handle Windows-style path', () => {
      const parsed: ParsedLink = {
        path: 'C:\\Users\\dev\\project\\src\\file.ts',
        start: { line: 42, character: 10 },
        end: { line: 42, character: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open C:\\Users\\dev\\project\\src\\file.ts:42:10 • RangeLink',
      );
    });

    it('should handle path with hash in filename', () => {
      const parsed: ParsedLink = {
        path: 'issue#123/auth.ts',
        start: { line: 42 },
        end: { line: 42 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open issue#123/auth.ts:42 • RangeLink');
    });

    it('should handle relative path', () => {
      const parsed: ParsedLink = {
        path: './src/utils/helper.ts',
        start: { line: 5, character: 0 },
        end: { line: 5, character: 0 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open ./src/utils/helper.ts:5:0 • RangeLink');
    });

    it('should handle absolute Unix path', () => {
      const parsed: ParsedLink = {
        path: '/home/user/project/src/file.ts',
        start: { line: 100, character: 25 },
        end: { line: 100, character: 25 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open /home/user/project/src/file.ts:100:25 • RangeLink',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle line 1 column 1', () => {
      const parsed: ParsedLink = {
        path: 'file.ts',
        start: { line: 1, character: 1 },
        end: { line: 1, character: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open file.ts:1:1 • RangeLink');
    });

    it('should handle large line numbers with range', () => {
      const parsed: ParsedLink = {
        path: 'bigfile.ts',
        start: { line: 9999, character: 99 },
        end: { line: 10000, character: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open bigfile.ts:9999:99-10000:1 • RangeLink',
      );
    });

    it('should handle character position 0', () => {
      const parsed: ParsedLink = {
        path: 'src/index.ts',
        start: { line: 10, character: 0 },
        end: { line: 10, character: 0 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open src/index.ts:10:0 • RangeLink');
    });
  });

  describe('Defensive validation', () => {
    it('should return undefined for null parsed data', () => {
      expect(formatLinkTooltip(null as unknown as ParsedLink)).toBeUndefined();
    });

    it('should return undefined for undefined parsed data', () => {
      expect(formatLinkTooltip(undefined as unknown as ParsedLink)).toBeUndefined();
    });

    it('should return undefined for missing path', () => {
      const parsed = {
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for empty path', () => {
      const parsed: ParsedLink = {
        path: '',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for whitespace-only path', () => {
      const parsed: ParsedLink = {
        path: '   ',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for non-string path', () => {
      const parsed = {
        path: 123,
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for missing start position', () => {
      const parsed = {
        path: 'file.ts',
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for missing start.line', () => {
      const parsed = {
        path: 'file.ts',
        start: { character: 5 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for invalid start.line (zero)', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 0 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for invalid start.line (negative)', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: -5 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for non-numeric start.line', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 'ten' },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for missing end position', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for missing end.line', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 10 },
        end: { character: 5 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for invalid end.line (zero)', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 0 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for invalid end.line (negative)', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: -5 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for non-numeric end.line', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 'twenty' },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for negative start.character', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 10, character: -5 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });

    it('should return undefined for negative end.character', () => {
      const parsed = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 10, character: -3 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      } as unknown as ParsedLink;

      expect(formatLinkTooltip(parsed)).toBeUndefined();
    });
  });
});
