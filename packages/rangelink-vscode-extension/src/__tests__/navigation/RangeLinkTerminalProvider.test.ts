import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import {
  LinkType,
  RangeLinkError,
  RangeLinkErrorCodes,
  Result,
  SelectionType,
} from 'rangelink-core-ts';
import type { ParsedLink } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from '../../navigation/RangeLinkTerminalProvider';
import type { RangeLinkTerminalLink } from '../../types';
import { createMockCancellationToken, createMockNavigationHandler } from '../helpers';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';

/**
 * Create a mock TerminalLinkContext for testing.
 *
 * @param line - The terminal line text
 * @returns Mock TerminalLinkContext
 */
const createMockTerminalContext = (line: string): vscode.TerminalLinkContext =>
  ({ line }) as vscode.TerminalLinkContext;

describe('RangeLinkTerminalProvider', () => {
  let provider: RangeLinkTerminalProvider;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockHandler: jest.Mocked<RangeLinkNavigationHandler>;

  beforeEach(() => {
    // Mock logger
    mockLogger = createMockLogger();

    mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'showWarningMessage').mockResolvedValue(undefined);

    // Create mock handler - test provider orchestration, not handler implementation
    mockHandler = createMockNavigationHandler();

    provider = new RangeLinkTerminalProvider(mockHandler, mockAdapter, mockLogger);
  });

  describe('provideTerminalLinks', () => {
    it('should detect single-line link', () => {
      // Mock handler responses
      const mockParsed: ParsedLink = {
        path: 'src/auth.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockHandler.parseLink.mockReturnValue(Result.ok(mockParsed));
      mockHandler.formatTooltip.mockReturnValue('Navigate to src/auth.ts at line 11');

      const context = createMockTerminalContext('Check src/auth.ts#L10');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(1);
      expect(links[0]).toStrictEqual({
        startIndex: 6,
        length: 15, // "src/auth.ts#L10" is 15 characters
        tooltip: 'Navigate to src/auth.ts at line 11',
        data: 'src/auth.ts#L10',
        parsed: mockParsed,
      });
      expect(mockHandler.parseLink).toHaveBeenCalledWith('src/auth.ts#L10');
      expect(mockHandler.formatTooltip).toHaveBeenCalledWith(mockParsed);
    });

    it('should detect multi-line range link', () => {
      const mockParsed: ParsedLink = {
        path: 'src/auth.ts',
        start: { line: 10 },
        end: { line: 20 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockHandler.parseLink.mockReturnValue(Result.ok(mockParsed));
      mockHandler.formatTooltip.mockReturnValue('Navigate to src/auth.ts: line 11 to line 21');

      const context = createMockTerminalContext('See src/auth.ts#L10-L20 for details');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toContain('Navigate to src/auth.ts');
      expect(mockHandler.parseLink).toHaveBeenCalledWith('src/auth.ts#L10-L20');
    });

    it('should detect link with columns', () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 5, char: 10 },
        end: { line: 10, char: 20 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockHandler.parseLink.mockReturnValue(Result.ok(mockParsed));
      mockHandler.formatTooltip.mockReturnValue('Navigate to src/file.ts: line 6, col 11');

      const context = createMockTerminalContext('src/file.ts#L5C10-L10C20');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toContain('line 6, col 11');
    });

    it('should detect rectangular mode link', () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 5, char: 10 },
        end: { line: 10, char: 20 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Rectangular,
      };
      mockHandler.parseLink.mockReturnValue(Result.ok(mockParsed));
      mockHandler.formatTooltip.mockReturnValue('Navigate to src/file.ts (rectangular selection)');

      const context = createMockTerminalContext('src/file.ts##L5C10-L10C20');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toContain('rectangular selection');
    });

    it('should detect multiple links in same line', () => {
      const mockParsed1: ParsedLink = {
        path: 'src/a.ts',
        start: { line: 1 },
        end: { line: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const mockParsed2: ParsedLink = {
        path: 'src/b.ts',
        start: { line: 2 },
        end: { line: 3 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockHandler.parseLink
        .mockReturnValueOnce(Result.ok(mockParsed1))
        .mockReturnValueOnce(Result.ok(mockParsed2));
      mockHandler.formatTooltip
        .mockReturnValueOnce('Navigate to src/a.ts')
        .mockReturnValueOnce('Navigate to src/b.ts');

      const context = createMockTerminalContext('First: src/a.ts#L1 and second: src/b.ts#L2-L3');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(2);
    });

    it('should skip invalid links and log parse failures', () => {
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Invalid link format',
        functionName: 'parseLink',
      });
      mockHandler.parseLink.mockReturnValue(Result.err(mockError));

      const context = createMockTerminalContext('Invalid: src/file.ts#L999999');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
          link: 'src/file.ts#L999999',
          error: mockError,
        },
        'Skipping link that failed to parse',
      );
      // Should log summary with parse failures
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
          lineLength: 28, // "Invalid: src/file.ts#L999999" is 28 characters
          matchesFound: 1,
          linksCreated: 0,
          parseFailed: 1,
        },
        'Processed RangeLink matches in terminal line',
      );
    });

    it('should handle empty line', () => {
      const context = createMockTerminalContext('');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(0);
    });

    it('should handle line with no links', () => {
      const context = createMockTerminalContext('No links here, just plain text');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(0);
    });

    it('should handle cancellation', () => {
      const context = createMockTerminalContext('src/a.ts#L1 src/b.ts#L2 src/c.ts#L3');
      const token = createMockCancellationToken(true);
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(0); // Should stop processing
      expect(mockHandler.parseLink).not.toHaveBeenCalled();
    });

    it('should log summary when matches are found', () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockHandler.parseLink.mockReturnValue(Result.ok(mockParsed));
      mockHandler.formatTooltip.mockReturnValue('Navigate to src/file.ts');

      const context = createMockTerminalContext('Check src/file.ts#L10');
      const token = createMockCancellationToken();
      provider.provideTerminalLinks(context, token);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
          lineLength: 21, // "Check src/file.ts#L10" is 21 characters
          matchesFound: 1,
          linksCreated: 1,
          parseFailed: 0,
        },
        'Processed RangeLink matches in terminal line',
      );
    });
  });

  describe('handleTerminalLink - Safety Net Validation', () => {
    it('should handle missing parsed data gracefully (safety net)', async () => {
      // Arrange: Create link with undefined parsed data
      // (Should never happen in practice, but testing the safety net)
      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 15,
        tooltip: 'Test link',
        data: 'file.ts#L0',
        parsed: undefined, // Safety net case
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Logger should receive linkText in logCtx plus full link object
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      const warnCall = (mockLogger.warn as jest.Mock).mock.calls[0];
      expect(warnCall[0]).toStrictEqual({
        fn: 'RangeLinkTerminalProvider.handleTerminalLink',
        linkText: 'file.ts#L0',
        link,
      });
      expect(warnCall[1]).toStrictEqual(
        'Terminal link clicked but parse data missing (safety net triggered)',
      );

      expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate - invalid link format: file.ts#L0',
      );

      // Should NOT proceed to navigation
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should delegate to handler when parsed data is present', async () => {
      // Arrange: Create valid link with parsed data
      const parsedData = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 15,
        tooltip: 'Open file.ts:10',
        data: 'file.ts#L10',
        parsed: parsedData,
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Provider should delegate to handler with correct parameters
      expect(mockHandler.navigateToLink).toHaveBeenCalledWith(parsedData, 'file.ts#L10');
      expect(mockHandler.navigateToLink).toHaveBeenCalledTimes(1);

      // Should NOT trigger the safety net warning
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockAdapter.showWarningMessage).not.toHaveBeenCalled();
    });
  });
});
