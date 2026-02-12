import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { ParsedLink } from 'rangelink-core-ts';
import { DEFAULT_DELIMITERS, LinkType, SelectionType } from 'rangelink-core-ts';
// Namespace import enables jest.spyOn for findLinksInText without jest.mock() hoisting.
// With CommonJS transform (ts-jest), the production code's named import resolves through
// the same module object, so spying here intercepts calls in the provider under test.
import * as rangelinkCore from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from '../../navigation/RangeLinkTerminalProvider';
import type { RangeLinkTerminalLink } from '../../types';
import {
  createMockCancellationToken,
  createMockDetectedLink,
  createMockNavigationHandler,
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

const GET_DELIMITERS = () => DEFAULT_DELIMITERS;

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
  let mockFindLinksInText: jest.SpyInstance;
  let mockShowWarningMessage: jest.Mock;

  beforeEach(() => {
    mockLogger = createMockLogger();

    mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
    mockAdapter = createMockVscodeAdapter({
      windowOptions: { showWarningMessage: mockShowWarningMessage },
    });

    mockHandler = createMockNavigationHandler();
    mockFindLinksInText = jest.spyOn(rangelinkCore, 'findLinksInText').mockReturnValue([]);

    provider = new RangeLinkTerminalProvider(mockHandler, GET_DELIMITERS, mockAdapter, mockLogger);
  });

  describe('provideTerminalLinks', () => {
    it('should map detected link to terminal link', () => {
      const detected = createMockDetectedLink();
      mockFindLinksInText.mockReturnValue([detected]);

      const context = createMockTerminalContext('Check src/file.ts#L10');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(1);
      expect(links[0]).toStrictEqual({
        startIndex: 6,
        length: 15,
        tooltip: 'Open src/file.ts:10 \u2022 RangeLink',
        data: 'src/file.ts#L10',
        parsed: detected.parsed,
      });
      expect(mockFindLinksInText).toHaveBeenCalledWith(
        'Check src/file.ts#L10',
        DEFAULT_DELIMITERS,
        mockLogger,
        token,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
          lineLength: 21,
          linksFound: 1,
        },
        'Scanned terminal line for RangeLinks',
      );
    });

    it('should map multiple detected links', () => {
      const parsed2: ParsedLink = {
        path: 'src/b.ts',
        quotedPath: 'src/b.ts',
        start: { line: 2 },
        end: { line: 3 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockFindLinksInText.mockReturnValue([
        createMockDetectedLink(),
        createMockDetectedLink({
          linkText: 'src/b.ts#L2-L3',
          startIndex: 30,
          length: 14,
          parsed: parsed2,
        }),
      ]);

      const context = createMockTerminalContext(
        'First: src/file.ts#L10 and second: src/b.ts#L2-L3',
      );
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(2);
      expect(links[0].data).toBe('src/file.ts#L10');
      expect(links[1].data).toBe('src/b.ts#L2-L3');
    });

    it('should return empty array when no links detected', () => {
      mockFindLinksInText.mockReturnValue([]);

      const context = createMockTerminalContext('No links here');
      const token = createMockCancellationToken();
      const links = provider.provideTerminalLinks(context, token) as RangeLinkTerminalLink[];

      expect(links).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkTerminalProvider.provideTerminalLinks',
          lineLength: 13,
          linksFound: 0,
        },
        'Scanned terminal line for RangeLinks',
      );
    });

    it('should pass cancellation token to findLinksInText', () => {
      mockFindLinksInText.mockReturnValue([]);

      const context = createMockTerminalContext('src/a.ts#L1');
      const token = createMockCancellationToken(true);
      provider.provideTerminalLinks(context, token);

      expect(mockFindLinksInText).toHaveBeenCalledWith(
        'src/a.ts#L1',
        DEFAULT_DELIMITERS,
        mockLogger,
        token,
      );
    });
  });

  describe('handleTerminalLink - Safety Net Validation', () => {
    it('should handle missing parsed data gracefully (safety net)', async () => {
      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 15,
        tooltip: 'Test link',
        data: 'file.ts#L0',
        parsed: undefined,
      };

      await provider.handleTerminalLink(link);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkTerminalProvider.handleTerminalLink',
          linkText: 'file.ts#L0',
          link,
        },
        'Terminal link clicked but parse data missing (safety net triggered)',
      );

      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate - invalid link format: file.ts#L0',
      );

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should delegate to handler when parsed data is present', async () => {
      const parsedData = {
        path: 'file.ts',
        quotedPath: 'file.ts',
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

      await provider.handleTerminalLink(link);

      expect(mockHandler.navigateToLink).toHaveBeenCalledWith(parsedData, 'file.ts#L10');
      expect(mockHandler.navigateToLink).toHaveBeenCalledTimes(1);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockShowWarningMessage).not.toHaveBeenCalled();
    });
  });
});
