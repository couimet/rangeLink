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
import * as vscode from 'vscode';

import { RangeLinkDocumentProvider } from '../../navigation/RangeLinkDocumentProvider';
import type { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import {
  createMockCancellationToken,
  createMockDocument,
  createMockPosition,
  createMockText,
  createMockUri,
} from '../helpers';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';

// Test pattern that matches common RangeLink formats for provider integration tests
// Provider doesn't validate pattern correctness (handler's responsibility)
// Pattern matches: [path]#[range] or [path]##[range] where path is non-whitespace chars
const TEST_RANGELINK_PATTERN = /\S+##?L\d+(C\d+)?(-L\d+(C\d+)?)?/g;

/**
 * Create a mock RangeLinkNavigationHandler for integration tests.
 *
 * Mocks all handler methods to focus tests on provider orchestration logic.
 * Tests verify delegation patterns, not handler implementation details.
 */
const createMockHandler = (): jest.Mocked<RangeLinkNavigationHandler> =>
  ({
    getPattern: jest.fn(() => TEST_RANGELINK_PATTERN),
    parseLink: jest.fn(),
    formatTooltip: jest.fn(),
    navigateToLink: jest.fn(),
  }) as unknown as jest.Mocked<RangeLinkNavigationHandler>;

describe('RangeLinkDocumentProvider', () => {
  let provider: RangeLinkDocumentProvider;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let mockHandler: jest.Mocked<RangeLinkNavigationHandler>;

  beforeEach(() => {
    // Create mock logger using barebone-logger-testing
    mockLogger = createMockLogger();

    // Create mock adapter
    mockAdapter = createMockVscodeAdapter();

    mockHandler = createMockHandler();
    provider = new RangeLinkDocumentProvider(mockHandler, mockAdapter, mockLogger);
  });

  describe('provideDocumentLinks', () => {
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

      const document = createMockDocument({
        getText: createMockText('Check src/auth.ts#L10'),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toContain('Navigate to src/auth.ts at line 11');
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

      const document = createMockDocument({
        getText: createMockText('See src/auth.ts#L10-L20 for details'),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

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

      const document = createMockDocument({
        getText: createMockText('src/file.ts#L5C10-L10C20'),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

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

      const document = createMockDocument({
        getText: createMockText('src/file.ts##L5C10-L10C20'),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toContain('rectangular selection');
    });

    it('should detect multiple links in same document', () => {
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

      const document = createMockDocument({
        getText: createMockText('First: src/a.ts#L1 and second: src/b.ts#L2-L3'),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(2);
    });

    it('should skip invalid links', () => {
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Invalid link format',
        functionName: 'parseLink',
      });
      mockHandler.parseLink.mockReturnValue(Result.err(mockError));

      // Use a link that matches the pattern but fails parsing
      const document = createMockDocument({
        getText: createMockText('Invalid: src/file.ts#L999999'),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ linkText: 'src/file.ts#L999999' }),
        'Skipping invalid link',
      );
    });

    it('should handle empty document', () => {
      const document = createMockDocument({
        getText: createMockText(''),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(0);
    });

    it('should handle cancellation', () => {
      const document = createMockDocument({
        getText: createMockText('src/a.ts#L1 src/b.ts#L2 src/c.ts#L3'),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken(true);
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links).toHaveLength(0); // Should stop processing
    });

    it('should create command URI with encoded arguments', () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockHandler.parseLink.mockReturnValue(Result.ok(mockParsed));
      mockHandler.formatTooltip.mockReturnValue('Navigate to src/file.ts');

      const document = createMockDocument({
        getText: createMockText('src/file.ts#L10'),
        uri: createMockUri('/test/file.ts'),
        positionAt: jest.fn((index: number) => createMockPosition(0, index)),
      });
      const token = createMockCancellationToken();
      const links = provider.provideDocumentLinks(document, token) as vscode.DocumentLink[];

      expect(links[0].target).toBeDefined();
      expect(links[0].target!.toString()).toContain('command:rangelink.handleDocumentLinkClick');
    });
  });

  describe('handleLinkClick', () => {
    it('should delegate to handler.navigateToLink', async () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
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
        expect.objectContaining({ error: mockError }),
        'Document link handling completed with error (already handled by navigation handler)',
      );
    });

    it('should not re-throw handler errors', async () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      mockHandler.navigateToLink.mockRejectedValue(new Error('Failed'));

      // Should not throw
      await expect(
        provider.handleLinkClick({ linkText: 'src/file.ts#L10', parsed: mockParsed }),
      ).resolves.toBeUndefined();
    });
  });
});
