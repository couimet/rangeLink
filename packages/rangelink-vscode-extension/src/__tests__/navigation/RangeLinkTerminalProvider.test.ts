import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { DelimiterConfig } from 'rangelink-core-ts';
import { LinkType, SelectionType } from 'rangelink-core-ts';

import { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import { RangeLinkTerminalProvider } from '../../navigation/RangeLinkTerminalProvider';
import type { RangeLinkTerminalLink } from '../../types';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showTextDocument: jest.fn(),
  },
  workspace: {
    workspaceFolders: [],
    openTextDocument: jest.fn(),
    fs: {
      stat: jest.fn(),
    },
  },
  Uri: {
    file: jest.fn(),
    parse: jest.fn(),
  },
  Selection: jest.fn(),
  Position: jest.fn(),
  Range: jest.fn(),
  TextEditorRevealType: {
    InCenterIfOutsideViewport: 1,
  },
}));

describe('RangeLinkTerminalProvider', () => {
  let provider: RangeLinkTerminalProvider;
  let mockLogger: Logger;
  let delimiters: DelimiterConfig;

  beforeEach(() => {
    // Mock logger
    mockLogger = createMockLogger();

    // Standard delimiters
    delimiters = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };

    // Create handler and provider
    const handler = new RangeLinkNavigationHandler(delimiters, mockLogger);
    provider = new RangeLinkTerminalProvider(handler, mockLogger);

    // Reset mocks
    jest.clearAllMocks();
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

      const vscode = require('vscode');

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

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate - invalid link format: file.ts#L0',
      );

      // Should NOT proceed to navigation
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    // TODO: re-asses this test's scope/coupling
    it.skip('should proceed past safety net when parsed data is present', async () => {
      // Arrange: Create valid link with parsed data
      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 15,
        tooltip: 'Open file.ts:10',
        data: 'file.ts#L10',
        parsed: {
          path: 'file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        },
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Should pass the safety net check and attempt navigation
      // Logger should now include linkText in logCtx
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'file.ts#L10',
          parsed: link.parsed,
        },
        'Navigating to RangeLink',
      );

      // Should NOT trigger the safety net warning
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  // TODO: re-asses this suite's scope/coupling
  describe.skip('handleTerminalLink - Single Position Selection Extension', () => {
    let vscode: any;
    let mockDocument: any;
    let mockEditor: any;

    beforeEach(() => {
      vscode = require('vscode');

      // Mock document with line content
      mockDocument = {
        lineCount: 100,
        lineAt: jest.fn((lineNumber: number) => ({
          text: 'const x = 42; // Sample line content',
        })),
      };

      // Mock editor
      mockEditor = {
        selections: [],
        revealRange: jest.fn(),
      };

      // Setup workspace mocks
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: [
          {
            uri: { fsPath: '/workspace' },
            name: 'test-workspace',
            index: 0,
          },
        ],
        writable: true,
        configurable: true,
      });

      // Mock file resolution
      const mockUri = { fsPath: '/workspace/file.ts' };
      vscode.Uri.file = jest.fn(() => mockUri);
      vscode.workspace.fs.stat = jest.fn().mockResolvedValue({});
      vscode.workspace.openTextDocument = jest.fn().mockResolvedValue(mockDocument);
      vscode.window.showTextDocument = jest.fn().mockResolvedValue(mockEditor);

      // Mock Position and Selection constructors
      vscode.Position = jest.fn((line, char) => ({ line, character: char }));
      vscode.Selection = jest.fn((anchor, active) => ({ anchor, active }));
    });

    it('should extend single-position selection by 1 character (normal case)', async () => {
      // Arrange: Single position at line 32, char 1
      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 20,
        tooltip: 'Open file.ts:32:1',
        data: 'file.ts#L32C1',
        parsed: {
          path: 'file.ts',
          start: { line: 32, char: 1 },
          end: { line: 32, char: 1 }, // Same position
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        },
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Should log extension
      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const extensionLog = debugCalls.find((call) =>
        call[1]?.includes('Extended single-position selection'),
      );

      expect(extensionLog).toBeDefined();
      expect(extensionLog[0]).toMatchObject({
        fn: 'RangeLinkTerminalProvider.handleTerminalLink',
        linkText: 'file.ts#L32C1',
        originalPos: '32:1',
        extendedTo: '32:2',
        reason: 'single-position selection needs visibility',
      });

      // Should create selection from (31,0) to (31,1) in 0-indexed coords
      expect(vscode.Selection).toHaveBeenCalledWith(
        expect.objectContaining({ line: 31, character: 0 }),
        expect.objectContaining({ line: 31, character: 1 }),
      );
    });

    it('should NOT extend when at end of line', async () => {
      // Arrange: Mock line with specific length
      mockDocument.lineAt = jest.fn((lineNumber: number) => ({
        text: 'short', // 5 characters (0-4)
      }));

      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 20,
        tooltip: 'Open file.ts:10:6',
        data: 'file.ts#L10C6',
        parsed: {
          path: 'file.ts',
          start: { line: 10, char: 6 }, // After "short" (position 6 = after all chars)
          end: { line: 10, char: 6 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        },
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Should log that it's keeping cursor only
      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const boundaryLog = debugCalls.find((call) => call[1]?.includes('keeping cursor only'));

      expect(boundaryLog).toBeDefined();
      expect(boundaryLog[0]).toMatchObject({
        fn: 'RangeLinkTerminalProvider.handleTerminalLink',
        linkText: 'file.ts#L10C6',
        position: '10:6',
        lineLength: 5,
        reason: 'end of line',
      });

      // Should NOT extend - selection remains at same position (clamped to lineLength)
      expect(vscode.Selection).toHaveBeenCalledWith(
        expect.objectContaining({ line: 9, character: 5 }),
        expect.objectContaining({ line: 9, character: 5 }), // Same position
      );
    });

    it('should NOT extend on empty line', async () => {
      // Arrange: Mock empty line
      mockDocument.lineAt = jest.fn((lineNumber: number) => ({
        text: '', // Empty line
      }));

      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 15,
        tooltip: 'Open file.ts:5:1',
        data: 'file.ts#L5C1',
        parsed: {
          path: 'file.ts',
          start: { line: 5, char: 1 },
          end: { line: 5, char: 1 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        },
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Should log that it's an empty line
      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const boundaryLog = debugCalls.find((call) => call[1]?.includes('keeping cursor only'));

      expect(boundaryLog).toBeDefined();
      expect(boundaryLog[0]).toMatchObject({
        fn: 'RangeLinkTerminalProvider.handleTerminalLink',
        linkText: 'file.ts#L5C1',
        position: '5:1',
        lineLength: 0,
        reason: 'empty line',
      });
    });

    it('should extend line-only single position (no character specified)', async () => {
      // Arrange: Single line position (defaults to char 0)
      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 12,
        tooltip: 'Open file.ts:20',
        data: 'file.ts#L20',
        parsed: {
          path: 'file.ts',
          start: { line: 20 }, // No char specified
          end: { line: 20 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        },
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Should extend from start of line (0) to character 1
      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const extensionLog = debugCalls.find((call) =>
        call[1]?.includes('Extended single-position selection'),
      );

      expect(extensionLog).toBeDefined();
      expect(extensionLog[0]).toMatchObject({
        originalPos: '20:1',
        extendedTo: '20:2',
      });
    });

    it('should NOT extend multi-line range selection', async () => {
      // Arrange: Multi-line range (should NOT be extended)
      const link: RangeLinkTerminalLink = {
        startIndex: 0,
        length: 20,
        tooltip: 'Open file.ts:10-20',
        data: 'file.ts#L10-L20',
        parsed: {
          path: 'file.ts',
          start: { line: 10 },
          end: { line: 20 }, // Different line
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        },
      };

      // Act
      await provider.handleTerminalLink(link);

      // Assert: Should NOT log extension (not a single position)
      const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const extensionLog = debugCalls.find((call) =>
        call[1]?.includes('Extended single-position selection'),
      );

      expect(extensionLog).toBeUndefined();

      // Should create selection from line 10 to line 20 (not extended)
      expect(vscode.Selection).toHaveBeenCalledWith(
        expect.objectContaining({ line: 9 }), // 0-indexed
        expect.objectContaining({ line: 19 }), // 0-indexed
      );
    });
  });
});
