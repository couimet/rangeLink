import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { ParsedLink } from 'rangelink-core-ts';
import { DEFAULT_DELIMITERS, LinkType, SelectionType } from 'rangelink-core-ts';
// Namespace import enables jest.spyOn for findLinksInText without jest.mock() hoisting.
// With CommonJS transform (ts-jest), the production code's named import resolves through
// the same module object, so spying here intercepts calls in the provider under test.
import * as rangelinkCore from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkDocumentProvider } from '../../navigation/RangeLinkDocumentProvider';
import type { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import {
  createMockCancellationToken,
  createMockDetectedLink,
  createMockDocument,
  createMockNavigationHandler,
  createMockPositionAt,
  createMockText,
  createMockUri,
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

const GET_DELIMITERS = () => DEFAULT_DELIMITERS;

describe('RangeLinkDocumentProvider', () => {
  let provider: RangeLinkDocumentProvider;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let mockHandler: jest.Mocked<RangeLinkNavigationHandler>;
  let mockFindLinksInText: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    mockHandler = createMockNavigationHandler();
    mockFindLinksInText = jest.spyOn(rangelinkCore, 'findLinksInText').mockReturnValue([]);
    provider = new RangeLinkDocumentProvider(mockHandler, GET_DELIMITERS, mockAdapter, mockLogger);
  });

  describe('provideDocumentLinks', () => {
    it('should map detected link to document link', () => {
      mockFindLinksInText.mockReturnValue([createMockDetectedLink()]);

      const document = createMockDocument({
        getText: createMockText('Check src/file.ts#L10'),
        uri: createMockUri('/test/file.ts'),
        positionAt: createMockPositionAt(),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toBe('Open src/file.ts:10 \u2022 RangeLink');
      expect(mockFindLinksInText).toHaveBeenCalledWith(
        'Check src/file.ts#L10',
        DEFAULT_DELIMITERS,
        mockLogger,
        token,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkDocumentProvider.provideDocumentLinks',
          documentUri: 'file:///test/file.ts',
          linksFound: 1,
        },
        'Found 1 RangeLinks in document',
      );
    });

    it('should create command URI with encoded arguments', () => {
      mockFindLinksInText.mockReturnValue([createMockDetectedLink()]);

      const document = createMockDocument({
        getText: createMockText('Check src/file.ts#L10'),
        uri: createMockUri('/test/file.ts'),
        positionAt: createMockPositionAt(),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links[0].target).toBeDefined();
      expect(links[0].target!.toString()).toContain('command:rangelink.handleDocumentLinkClick');
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

      const document = createMockDocument({
        getText: createMockText('First: src/file.ts#L10 and second: src/b.ts#L2-L3'),
        uri: createMockUri('/test/file.ts'),
        positionAt: createMockPositionAt(),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(2);
    });

    it('should return empty array when no links detected', () => {
      mockFindLinksInText.mockReturnValue([]);

      const document = createMockDocument({
        getText: createMockText(''),
        uri: createMockUri('/test/file.ts'),
        positionAt: createMockPositionAt(),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(0);
    });

    it('should pass cancellation token to findLinksInText', () => {
      mockFindLinksInText.mockReturnValue([]);

      const document = createMockDocument({
        getText: createMockText('src/a.ts#L1'),
        uri: createMockUri('/test/file.ts'),
        positionAt: createMockPositionAt(),
      });
      const token = createMockCancellationToken(true);
      provider.provideDocumentLinks(document, token);

      expect(mockFindLinksInText).toHaveBeenCalledWith(
        'src/a.ts#L1',
        DEFAULT_DELIMITERS,
        mockLogger,
        token,
      );
    });
  });

  describe('handleLinkClick', () => {
    it('should delegate to handler.navigateToLink', async () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        quotedPath: 'src/file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'src/file.ts#L10';
      mockHandler.navigateToLink.mockResolvedValue(undefined);

      await provider.handleLinkClick({ linkText, parsed: mockParsed });

      expect(mockHandler.navigateToLink).toHaveBeenCalledTimes(1);
      expect(mockHandler.navigateToLink).toHaveBeenCalledWith(mockParsed, linkText);
    });

    it('should handle navigation errors gracefully', async () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        quotedPath: 'src/file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'src/file.ts#L10';
      const mockError = new Error('Navigation failed');
      mockHandler.navigateToLink.mockRejectedValue(mockError);

      await provider.handleLinkClick({ linkText, parsed: mockParsed });

      expect(mockHandler.navigateToLink).toHaveBeenCalledWith(mockParsed, linkText);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkDocumentProvider.handleLinkClick',
          linkText: 'src/file.ts#L10',
          error: mockError,
        },
        'Document link handling completed with error (already handled by navigation handler)',
      );
    });

    it('should not re-throw handler errors', async () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        quotedPath: 'src/file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockHandler.navigateToLink.mockRejectedValue(new Error('Failed'));

      await expect(
        provider.handleLinkClick({ linkText: 'src/file.ts#L10', parsed: mockParsed }),
      ).resolves.toBeUndefined();
    });
  });
});
