import type { ParsedLink } from 'rangelink-core-ts';
import { LinkType, SelectionType } from 'rangelink-core-ts';

import { formatLinkTooltip } from '../../utils/formatLinkTooltip';

// Mock getPlatformModifierKey
jest.mock('../../utils/getPlatformModifierKey', () => ({
  getPlatformModifierKey: jest.fn(),
}));

import { getPlatformModifierKey } from '../../utils/getPlatformModifierKey';

const mockGetPlatformModifierKey = getPlatformModifierKey as jest.MockedFunction<
  typeof getPlatformModifierKey
>;

describe('formatLinkTooltip', () => {
  beforeEach(() => {
    // Default to macOS for most tests
    mockGetPlatformModifierKey.mockReturnValue('Cmd');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Parse failure (undefined parsed)', () => {
    it('should return generic tooltip for undefined parsed (macOS)', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      expect(formatLinkTooltip(undefined)).toStrictEqual('Open in editor (Cmd+Click) • RangeLink');
      expect(mockGetPlatformModifierKey).toHaveBeenCalledTimes(1);
    });

    it('should return generic tooltip for undefined parsed (Windows)', () => {
      mockGetPlatformModifierKey.mockReturnValue('Ctrl');

      expect(formatLinkTooltip(undefined)).toStrictEqual('Open in editor (Ctrl+Click) • RangeLink');
      expect(mockGetPlatformModifierKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Parse success with line and character', () => {
    it('should format tooltip with path, line, and character (macOS)', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      const parsed: ParsedLink = {
        path: 'src/auth.ts',
        start: { line: 42, char: 10 },
        end: { line: 42, char: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open src/auth.ts:42:10 (Cmd+Click) • RangeLink',
      );
      expect(mockGetPlatformModifierKey).toHaveBeenCalledTimes(1);
    });

    it('should format tooltip with path, line, and character (Windows)', () => {
      mockGetPlatformModifierKey.mockReturnValue('Ctrl');

      const parsed: ParsedLink = {
        path: 'src/validation.ts',
        start: { line: 10, char: 5 },
        end: { line: 10, char: 5 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open src/validation.ts:10:5 (Ctrl+Click) • RangeLink',
      );
      expect(mockGetPlatformModifierKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Parse success with line only (no character)', () => {
    it('should format tooltip with path and line range (macOS)', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      const parsed: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 10 },
        end: { line: 20 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open src/file.ts:10-20 (Cmd+Click) • RangeLink',
      );
      expect(mockGetPlatformModifierKey).toHaveBeenCalledTimes(1);
    });

    it('should format tooltip with path and single line (Windows)', () => {
      mockGetPlatformModifierKey.mockReturnValue('Ctrl');

      const parsed: ParsedLink = {
        path: 'README.md',
        start: { line: 1 },
        end: { line: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open README.md:1 (Ctrl+Click) • RangeLink');
      expect(mockGetPlatformModifierKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Range selection (value prop)', () => {
    it('should show full range to highlight RangeLink value prop (macOS)', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      const parsed: ParsedLink = {
        path: 'src/auth.ts',
        start: { line: 10, char: 5 },
        end: { line: 25, char: 30 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      // Shows the FULL range - this is RangeLink's value prop!
      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open src/auth.ts:10:5-25:30 (Cmd+Click) • RangeLink',
      );
      expect(mockGetPlatformModifierKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rectangular selection mode', () => {
    it('should format tooltip for rectangular selection showing full range (macOS)', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      const parsed: ParsedLink = {
        path: 'data.csv',
        start: { line: 10, char: 5 },
        end: { line: 20, char: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Rectangular,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open data.csv:10:5-20:10 (Cmd+Click) • RangeLink',
      );
      expect(mockGetPlatformModifierKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Various file paths', () => {
    it('should handle Windows-style path', () => {
      mockGetPlatformModifierKey.mockReturnValue('Ctrl');

      const parsed: ParsedLink = {
        path: 'C:\\Users\\dev\\project\\src\\file.ts',
        start: { line: 42, char: 10 },
        end: { line: 42, char: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open C:\\Users\\dev\\project\\src\\file.ts:42:10 (Ctrl+Click) • RangeLink',
      );
    });

    it('should handle path with hash in filename', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      const parsed: ParsedLink = {
        path: 'issue#123/auth.ts',
        start: { line: 42 },
        end: { line: 42 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open issue#123/auth.ts:42 (Cmd+Click) • RangeLink',
      );
    });

    it('should handle relative path', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      const parsed: ParsedLink = {
        path: './src/utils/helper.ts',
        start: { line: 5, char: 0 },
        end: { line: 5, char: 0 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open ./src/utils/helper.ts:5:0 (Cmd+Click) • RangeLink',
      );
    });

    it('should handle absolute Unix path', () => {
      mockGetPlatformModifierKey.mockReturnValue('Ctrl');

      const parsed: ParsedLink = {
        path: '/home/user/project/src/file.ts',
        start: { line: 100, char: 25 },
        end: { line: 100, char: 25 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open /home/user/project/src/file.ts:100:25 (Ctrl+Click) • RangeLink',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle line 1 column 1', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      const parsed: ParsedLink = {
        path: 'file.ts',
        start: { line: 1, char: 1 },
        end: { line: 1, char: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual('Open file.ts:1:1 (Cmd+Click) • RangeLink');
    });

    it('should handle large line numbers with range', () => {
      mockGetPlatformModifierKey.mockReturnValue('Ctrl');

      const parsed: ParsedLink = {
        path: 'bigfile.ts',
        start: { line: 9999, char: 99 },
        end: { line: 10000, char: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open bigfile.ts:9999:99-10000:1 (Ctrl+Click) • RangeLink',
      );
    });

    it('should handle character position 0', () => {
      mockGetPlatformModifierKey.mockReturnValue('Cmd');

      const parsed: ParsedLink = {
        path: 'src/index.ts',
        start: { line: 10, char: 0 },
        end: { line: 10, char: 0 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      expect(formatLinkTooltip(parsed)).toStrictEqual(
        'Open src/index.ts:10:0 (Cmd+Click) • RangeLink',
      );
    });
  });
});
