import type { Logger } from 'barebone-logger';
import type { DelimiterConfig, ParsedLink } from 'rangelink-core-ts';
import {
  buildLinkPattern,
  LinkType,
  parseLink,
  RangeLinkError,
  RangeLinkErrorCodes,
  Result,
  SelectionType,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import { convertRangeLinkPosition } from '../../utils/convertRangeLinkPosition';
import { formatLinkPosition } from '../../utils/formatLinkPosition';
import { formatLinkTooltip } from '../../utils/formatLinkTooltip';
import { resolveWorkspacePath } from '../../utils/resolveWorkspacePath';

// Mock all dependencies from rangelink-core-ts
jest.mock('rangelink-core-ts', () => ({
  buildLinkPattern: jest.fn(),
  parseLink: jest.fn(),
  Result: jest.requireActual('rangelink-core-ts').Result,
  RangeLinkError: jest.requireActual('rangelink-core-ts').RangeLinkError,
  RangeLinkErrorCodes: jest.requireActual('rangelink-core-ts').RangeLinkErrorCodes,
  SelectionType: jest.requireActual('rangelink-core-ts').SelectionType,
  LinkType: jest.requireActual('rangelink-core-ts').LinkType,
}));

// Mock vscode module
jest.mock('vscode', () => {
  const mockUri = (path: string) => ({ fsPath: path, scheme: 'file', path });

  return {
    window: {
      showWarningMessage: jest.fn(),
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn(),
      showTextDocument: jest.fn(),
    },
    workspace: {
      openTextDocument: jest.fn(),
    },
    Position: jest.fn((line: number, character: number) => ({ line, character })),
    Range: jest.fn((start: any, end: any) => ({ start, end })),
    Selection: jest.fn((anchor: any, active: any) => ({ anchor, active })),
    TextEditorRevealType: {
      InCenterIfOutsideViewport: 2,
    },
    Uri: {
      file: mockUri,
    },
  };
});

// Mock utility functions
jest.mock('../../utils/convertRangeLinkPosition');
jest.mock('../../utils/formatLinkPosition');
jest.mock('../../utils/formatLinkTooltip');
jest.mock('../../utils/resolveWorkspacePath');

describe('RangeLinkNavigationHandler', () => {
  let handler: RangeLinkNavigationHandler;
  let mockLogger: Logger;
  let mockDelimiters: DelimiterConfig;
  let mockPattern: RegExp;

  beforeEach(() => {
    // Setup mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    // Setup mock delimiters
    mockDelimiters = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };

    // Setup mock pattern
    mockPattern = /mock-pattern/;
    (buildLinkPattern as jest.Mock).mockReturnValue(mockPattern);

    // Create handler instance
    handler = new RangeLinkNavigationHandler(mockDelimiters, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should call buildLinkPattern with delimiters', () => {
      expect(buildLinkPattern).toHaveBeenCalledWith(mockDelimiters);
      expect(buildLinkPattern).toHaveBeenCalledTimes(1);
    });

    it('should log initialization with delimiter config', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkNavigationHandler.constructor', delimiters: mockDelimiters },
        'RangeLinkNavigationHandler initialized with delimiter config',
      );
    });

    it('should store the compiled pattern', () => {
      expect(handler.getPattern()).toStrictEqual(mockPattern);
    });
  });

  describe('getPattern', () => {
    it('should return the compiled RegExp pattern', () => {
      const pattern = handler.getPattern();

      expect(pattern).toStrictEqual(mockPattern);
    });

    it('should return the same pattern instance on multiple calls', () => {
      const pattern1 = handler.getPattern();
      const pattern2 = handler.getPattern();

      expect(pattern1).toStrictEqual(pattern2);
      expect(pattern1).toBe(pattern2); // Reference equality
    });
  });

  describe('parseLink', () => {
    it('should delegate to core parseLink with link text and delimiters', () => {
      const linkText = 'src/file.ts#L10';
      const mockResult = Result.ok<ParsedLink>({
        path: 'src/file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      });
      (parseLink as jest.Mock).mockReturnValue(mockResult);

      const result = handler.parseLink(linkText);

      expect(parseLink).toHaveBeenCalledWith(linkText, mockDelimiters);
      expect(parseLink).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual(mockResult);
    });

    it('should return success result when parsing succeeds', () => {
      const linkText = 'src/auth.ts#L42C10';
      const mockParsed: ParsedLink = {
        path: 'src/auth.ts',
        start: { line: 42, char: 10 },
        end: { line: 42, char: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const mockResult = Result.ok<ParsedLink>(mockParsed);
      (parseLink as jest.Mock).mockReturnValue(mockResult);

      const result = handler.parseLink(linkText);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toStrictEqual(mockParsed);
      }
    });

    it('should return error result when parsing fails', () => {
      const linkText = 'invalid-link';
      const mockError = new RangeLinkError({
        code: RangeLinkErrorCodes.PARSE_INVALID_RANGE_FORMAT,
        message: 'Invalid link format',
        functionName: 'parseLink',
      });
      const mockResult = Result.err<RangeLinkError>(mockError);
      (parseLink as jest.Mock).mockReturnValue(mockResult);

      const result = handler.parseLink(linkText);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toStrictEqual(mockError);
      }
    });

    it('should handle different link formats by delegating to core parseLink', () => {
      const testCases = [
        'file.ts#L10',
        'file.ts#L10-L20',
        'file.ts#L10C5-L20C10',
        'file.ts##L10C5-L20C10',
      ];

      testCases.forEach((linkText) => {
        (parseLink as jest.Mock).mockClear();
        const mockResult = Result.ok<ParsedLink>({
          path: 'file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        });
        (parseLink as jest.Mock).mockReturnValue(mockResult);

        handler.parseLink(linkText);

        expect(parseLink).toHaveBeenCalledWith(linkText, mockDelimiters);
      });
    });
  });

  describe('formatTooltip', () => {
    it('should delegate to formatLinkTooltip utility', () => {
      const mockParsed: ParsedLink = {
        path: 'src/file.ts',
        start: { line: 10, char: 5 },
        end: { line: 20, char: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const expectedTooltip = 'Open src/file.ts:10:5-20:10 • RangeLink';
      (formatLinkTooltip as jest.Mock).mockReturnValue(expectedTooltip);

      const result = handler.formatTooltip(mockParsed);

      expect(formatLinkTooltip).toHaveBeenCalledWith(mockParsed);
      expect(formatLinkTooltip).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual(expectedTooltip);
    });

    it('should return undefined when formatLinkTooltip returns undefined', () => {
      const mockParsed: ParsedLink = {
        path: '',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      (formatLinkTooltip as jest.Mock).mockReturnValue(undefined);

      const result = handler.formatTooltip(mockParsed);

      expect(result).toBeUndefined();
    });
  });

  describe('navigateToLink', () => {
    let mockParsed: ParsedLink;
    let mockDocument: vscode.TextDocument;
    let mockEditor: vscode.TextEditor;

    beforeEach(() => {
      mockParsed = {
        path: 'src/file.ts',
        start: { line: 10, char: 5 },
        end: { line: 20, char: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      mockDocument = {
        uri: vscode.Uri.file('src/file.ts'),
        lineCount: 100,
      } as unknown as vscode.TextDocument;

      mockEditor = {
        document: mockDocument,
        selection: undefined,
        selections: [],
        revealRange: jest.fn(),
      } as unknown as vscode.TextEditor;

      // Setup default mock implementations
      (resolveWorkspacePath as jest.Mock).mockResolvedValue(vscode.Uri.file('src/file.ts'));
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
      (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(mockEditor);
      (convertRangeLinkPosition as jest.Mock).mockImplementation((pos: any) => ({
        line: pos.line - 1,
        character: pos.char || 0,
      }));
      (formatLinkPosition as jest.Mock).mockReturnValue('10:5-20:10');
    });

    describe('successful navigation', () => {
      it('should resolve workspace path with parsed path', async () => {
        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(resolveWorkspacePath).toHaveBeenCalledWith('src/file.ts');
        expect(resolveWorkspacePath).toHaveBeenCalledTimes(1);
      });

      it('should log navigation start with parsed data', async () => {
        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkNavigationHandler.navigateToLink',
            linkText: 'src/file.ts#L10C5-L20C10',
            parsed: mockParsed,
          },
          'Navigating to RangeLink',
        );
      });

      it('should open text document with resolved URI', async () => {
        const mockUri = vscode.Uri.file('src/file.ts');
        (resolveWorkspacePath as jest.Mock).mockResolvedValue(mockUri);

        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri);
        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
      });

      it('should show text document in editor', async () => {
        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
        expect(vscode.window.showTextDocument).toHaveBeenCalledTimes(1);
      });

      it('should convert start position using convertRangeLinkPosition', async () => {
        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(convertRangeLinkPosition).toHaveBeenCalledWith({ line: 10, char: 5 }, mockDocument);
      });

      it('should convert end position using convertRangeLinkPosition', async () => {
        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(convertRangeLinkPosition).toHaveBeenCalledWith({ line: 20, char: 10 }, mockDocument);
      });

      it('should use start position as end when end is undefined', async () => {
        const parsedSingleLine: ParsedLink = {
          ...mockParsed,
          end: undefined as any,
        };

        await handler.navigateToLink(parsedSingleLine, 'src/file.ts#L10C5');

        // convertRangeLinkPosition should only be called once with start
        expect(convertRangeLinkPosition).toHaveBeenCalledTimes(1);
        expect(convertRangeLinkPosition).toHaveBeenCalledWith({ line: 10, char: 5 }, mockDocument);
      });

      it('should set editor selection for normal selection type', async () => {
        (convertRangeLinkPosition as jest.Mock)
          .mockReturnValueOnce({ line: 9, character: 4 })
          .mockReturnValueOnce({ line: 19, character: 9 });

        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(mockEditor.selection).toBeDefined();
        // Verify Position was called with converted values
        expect(vscode.Position).toHaveBeenCalledWith(9, 4);
        expect(vscode.Position).toHaveBeenCalledWith(19, 9);
        // Verify Selection was created
        expect(vscode.Selection).toHaveBeenCalled();
      });

      it('should log selection type when set', async () => {
        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkNavigationHandler.navigateToLink',
            linkText: 'src/file.ts#L10C5-L20C10',
            selectionType: SelectionType.Normal,
          },
          'Set selection',
        );
      });

      it('should reveal range in editor viewport', async () => {
        (convertRangeLinkPosition as jest.Mock)
          .mockReturnValueOnce({ line: 9, character: 4 })
          .mockReturnValueOnce({ line: 19, character: 9 });

        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        // Verify Range was created with correct positions
        expect(vscode.Range).toHaveBeenCalled();
        // Verify revealRange was called with correct reveal type
        expect(mockEditor.revealRange).toHaveBeenCalledWith(
          expect.anything(),
          vscode.TextEditorRevealType.InCenterIfOutsideViewport,
        );
        expect(mockEditor.revealRange).toHaveBeenCalledTimes(1);
      });

      it('should log navigation completion', async () => {
        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkNavigationHandler.navigateToLink',
            linkText: 'src/file.ts#L10C5-L20C10',
          },
          'Navigation completed successfully',
        );
      });

      it('should show success message with formatted position', async () => {
        (formatLinkPosition as jest.Mock).mockReturnValue('10:5-20:10');

        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(formatLinkPosition).toHaveBeenCalledWith(
          { line: 10, char: 5 },
          { line: 20, char: 10 },
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          'RangeLink: Navigated to src/file.ts @ 10:5-20:10',
        );
      });
    });

    describe('rectangular selection mode', () => {
      beforeEach(() => {
        mockParsed = {
          path: 'data.csv',
          start: { line: 10, char: 5 },
          end: { line: 15, char: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Rectangular,
        };

        // Restore vscode mocks that were cleared by jest.clearAllMocks() in afterEach
        // These must be restored with their original implementations
        (vscode.Position as jest.Mock).mockImplementation((line: number, character: number) => ({
          line,
          character,
        }));
        (vscode.Range as jest.Mock).mockImplementation((start: any, end: any) => ({ start, end }));
        (vscode.Selection as jest.Mock).mockImplementation((anchor: any, active: any) => ({
          anchor,
          active,
        }));

        // Reset only the specific mocks we need to reconfigure
        (resolveWorkspacePath as jest.Mock)
          .mockClear()
          .mockResolvedValue(vscode.Uri.file('data.csv'));
        (vscode.workspace.openTextDocument as jest.Mock)
          .mockClear()
          .mockResolvedValue(mockDocument);
        (vscode.window.showTextDocument as jest.Mock).mockClear().mockResolvedValue(mockEditor);
        (convertRangeLinkPosition as jest.Mock)
          .mockClear()
          .mockReturnValueOnce({ line: 9, character: 4 })
          .mockReturnValueOnce({ line: 14, character: 9 });
        (formatLinkPosition as jest.Mock).mockClear().mockReturnValue('10:5-15:10');
      });

      it('should create multi-cursor selections for rectangular mode', async () => {
        await handler.navigateToLink(mockParsed, 'data.csv##L10C5-L15C10');

        // Should create selections for lines 9-14 (converted from 10-15)
        // Verify Position was called (the loop creates Position objects)
        expect(vscode.Position).toHaveBeenCalled();

        // The actual rectangular selection path was executed (check log was called)
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            fn: 'RangeLinkNavigationHandler.navigateToLink',
            linkText: 'data.csv##L10C5-L15C10',
            lineCount: 6,
          }),
          'Set rectangular selection (multi-cursor)',
        );
      });

      it('should create selection for each line in range', async () => {
        await handler.navigateToLink(mockParsed, 'data.csv##L10C5-L15C10');

        // Verify Position was called with line numbers in the range
        // The loop iterates from vsStart.line (9) to vsEnd.line (14)
        // Using vsStart.character (4) and vsEnd.character (9)
        expect(vscode.Position).toHaveBeenCalledWith(9, 4);
        expect(vscode.Position).toHaveBeenCalledWith(9, 9);
        expect(vscode.Position).toHaveBeenCalledWith(14, 4);
        expect(vscode.Position).toHaveBeenCalledWith(14, 9);
      });

      it('should log rectangular selection with line count', async () => {
        await handler.navigateToLink(mockParsed, 'data.csv##L10C5-L15C10');

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            fn: 'RangeLinkNavigationHandler.navigateToLink',
            linkText: 'data.csv##L10C5-L15C10',
            lineCount: 6,
          }),
          'Set rectangular selection (multi-cursor)',
        );
      });

      it('should handle single-line rectangular selection', async () => {
        const singleLineRect: ParsedLink = {
          ...mockParsed,
          start: { line: 10, char: 5 },
          end: { line: 10, char: 10 },
        };
        // Re-setup mocks for this specific test case
        (vscode.Position as jest.Mock).mockImplementation((line: number, character: number) => ({
          line,
          character,
        }));
        (vscode.Range as jest.Mock).mockImplementation((start: any, end: any) => ({ start, end }));
        (vscode.Selection as jest.Mock).mockImplementation((anchor: any, active: any) => ({
          anchor,
          active,
        }));

        (resolveWorkspacePath as jest.Mock)
          .mockClear()
          .mockResolvedValue(vscode.Uri.file('data.csv'));
        (vscode.workspace.openTextDocument as jest.Mock)
          .mockClear()
          .mockResolvedValue(mockDocument);
        (vscode.window.showTextDocument as jest.Mock).mockClear().mockResolvedValue(mockEditor);
        // Use mockReset() to fully clear previous test's return values
        (convertRangeLinkPosition as jest.Mock)
          .mockReset()
          .mockReturnValueOnce({ line: 9, character: 4 })
          .mockReturnValueOnce({ line: 9, character: 9 });
        (formatLinkPosition as jest.Mock).mockClear().mockReturnValue('10:5-10:10');

        await handler.navigateToLink(singleLineRect, 'data.csv##L10C5-L10C10');

        // Verify rectangular mode log was called with line count 1
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            fn: 'RangeLinkNavigationHandler.navigateToLink',
            linkText: 'data.csv##L10C5-L10C10',
            lineCount: 1,
          }),
          'Set rectangular selection (multi-cursor)',
        );
      });
    });

    describe('path resolution failure', () => {
      it('should show warning message when path cannot be resolved', async () => {
        (resolveWorkspacePath as jest.Mock).mockResolvedValue(undefined);

        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot find file: src/file.ts',
        );
        expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
      });

      it('should log warning when path resolution fails', async () => {
        (resolveWorkspacePath as jest.Mock).mockResolvedValue(undefined);

        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkNavigationHandler.navigateToLink',
            linkText: 'src/file.ts#L10C5-L20C10',
            path: 'src/file.ts',
          },
          'Failed to resolve workspace path',
        );
      });

      it('should return early without opening document', async () => {
        (resolveWorkspacePath as jest.Mock).mockResolvedValue(undefined);

        await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');

        expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
        expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
      });
    });

    describe('navigation error handling', () => {
      it('should show error message when document opening fails', async () => {
        const mockError = new Error('File not found');
        (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(mockError);

        await expect(
          handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10'),
        ).rejects.toThrow(mockError);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Failed to navigate to src/file.ts: File not found',
        );
      });

      it('should log error when navigation fails', async () => {
        const mockError = new Error('File not found');
        (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(mockError);

        await expect(
          handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10'),
        ).rejects.toThrow(mockError);

        expect(mockLogger.error).toHaveBeenCalledWith(
          {
            fn: 'RangeLinkNavigationHandler.navigateToLink',
            linkText: 'src/file.ts#L10C5-L20C10',
            error: mockError,
          },
          'Navigation failed',
        );
      });

      it('should re-throw error for caller to handle', async () => {
        const mockError = new Error('File not found');
        (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(mockError);

        await expect(
          handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10'),
        ).rejects.toThrow('File not found');
      });

      it('should handle non-Error objects in error message', async () => {
        const mockError = 'String error';
        (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(mockError);

        // Non-Error rejections will still be thrown
        try {
          await handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10');
          // Should not reach here
          expect(true).toBe(false);
        } catch {
          // Error was thrown as expected
          expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            'RangeLink: Failed to navigate to src/file.ts: String error',
          );
        }
      });

      it('should handle error when showing text document fails', async () => {
        const mockError = new Error('Editor not available');
        (vscode.window.showTextDocument as jest.Mock).mockRejectedValue(mockError);

        await expect(
          handler.navigateToLink(mockParsed, 'src/file.ts#L10C5-L20C10'),
        ).rejects.toThrow(mockError);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Failed to navigate to src/file.ts: Editor not available',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle path with no directory component', async () => {
        const parsed: ParsedLink = {
          path: 'README.md',
          start: { line: 1 },
          end: { line: 1 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        await handler.navigateToLink(parsed, 'README.md#L1');

        expect(resolveWorkspacePath).toHaveBeenCalledWith('README.md');
      });

      it('should handle absolute path', async () => {
        const parsed: ParsedLink = {
          path: '/home/user/project/src/file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        await handler.navigateToLink(parsed, '/home/user/project/src/file.ts#L10');

        expect(resolveWorkspacePath).toHaveBeenCalledWith('/home/user/project/src/file.ts');
      });

      it('should handle Windows-style path', async () => {
        const parsed: ParsedLink = {
          path: 'C:\\Users\\dev\\project\\src\\file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        await handler.navigateToLink(parsed, 'C:\\Users\\dev\\project\\src\\file.ts#L10');

        expect(resolveWorkspacePath).toHaveBeenCalledWith('C:\\Users\\dev\\project\\src\\file.ts');
      });

      it('should handle path with hash in filename', async () => {
        const parsed: ParsedLink = {
          path: 'issue#123/file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        await handler.navigateToLink(parsed, 'issue#123/file.ts#L10');

        expect(resolveWorkspacePath).toHaveBeenCalledWith('issue#123/file.ts');
      });

      it('should handle line 1 column 1', async () => {
        const parsed: ParsedLink = {
          path: 'src/file.ts',
          start: { line: 1, char: 1 },
          end: { line: 1, char: 1 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };
        (convertRangeLinkPosition as jest.Mock).mockReturnValue({ line: 0, character: 0 });

        await handler.navigateToLink(parsed, 'src/file.ts#L1C1');

        expect(convertRangeLinkPosition).toHaveBeenCalledWith({ line: 1, char: 1 }, mockDocument);
      });

      it('should handle large line numbers', async () => {
        const parsed: ParsedLink = {
          path: 'bigfile.ts',
          start: { line: 9999 },
          end: { line: 10000 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        await handler.navigateToLink(parsed, 'bigfile.ts#L9999-L10000');

        expect(convertRangeLinkPosition).toHaveBeenCalledWith({ line: 9999 }, mockDocument);
        expect(convertRangeLinkPosition).toHaveBeenCalledWith({ line: 10000 }, mockDocument);
      });
    });
  });
});
