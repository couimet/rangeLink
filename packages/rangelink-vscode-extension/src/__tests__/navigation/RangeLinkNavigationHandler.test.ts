import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import { LinkType, SelectionType, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import type { ParsedLink } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';

// Mock vscode module - must be inline due to Jest hoisting
jest.mock('vscode', () => ({
  window: {
    activeTerminal: undefined,
    activeTextEditor: undefined,
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
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
  Position: jest.fn((line: number, character: number) => ({ line, character })),
  Selection: jest.fn(
    (anchor: { line: number; character: number }, active: { line: number; character: number }) => ({
      anchor,
      active,
    }),
  ),
  Range: jest.fn(
    (start: { line: number; character: number }, end: { line: number; character: number }) => ({
      start,
      end,
    }),
  ),
  TextEditorRevealType: {
    InCenterIfOutsideViewport: 2,
  },
}));

describe('RangeLinkNavigationHandler - Single Position Selection Extension', () => {
  let handler: RangeLinkNavigationHandler;
  let mockLogger: Logger;
  let mockIdeAdapter: any;
  let mockDocument: any;
  let mockEditor: any;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockIdeAdapter = {
      showWarningMessage: jest.fn(),
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn(),
      showTextDocument: jest.fn(),
    };
    handler = new RangeLinkNavigationHandler(DEFAULT_DELIMITERS, mockIdeAdapter, mockLogger);

    // Mock document with default line content (can be overridden in tests)
    mockDocument = {
      lineCount: 100,
      lineAt: jest.fn(() => ({ text: 'const x = 42; // Sample line content' })),
    };

    mockEditor = {
      document: mockDocument,
      selection: null,
      selections: [],
      revealRange: jest.fn(),
    };

    // Configure vscode mocks for navigation
    (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/workspace' } }];
    (vscode.Uri.file as jest.Mock).mockReturnValue({ fsPath: '/workspace/file.ts' });
    (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({});
    mockIdeAdapter.showTextDocument.mockResolvedValue(mockEditor);
    (vscode.Position as jest.Mock).mockImplementation((line: number, char: number) => ({
      line,
      character: char,
    }));
    (vscode.Selection as jest.Mock).mockImplementation((anchor: any, active: any) => ({
      anchor,
      active,
    }));
    (vscode.Range as jest.Mock).mockImplementation((start: any, end: any) => ({ start, end }));
  });

  it('should extend single-position selection by 1 character (normal case)', async () => {
    // Arrange: Single position at line 32, char 1
    const parsed: ParsedLink = {
      path: 'file.ts',
      start: { line: 32, char: 1 },
      end: { line: 32, char: 1 }, // Same position
      linkType: LinkType.Regular,
      selectionType: SelectionType.Normal,
    };
    const linkText = 'file.ts#L32C1';

    // Act
    await handler.navigateToLink(parsed, linkText);

    // Assert: Should log extension
    const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
    const extensionLog = debugCalls.find((call) =>
      call[1]?.includes('Extended single-position selection'),
    );

    expect(extensionLog).toBeDefined();
    expect(extensionLog[0]).toMatchObject({
      fn: 'RangeLinkNavigationHandler.navigateToLink',
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
    mockDocument.lineAt = jest.fn(() => ({
      text: 'short', // 5 characters (0-4)
    }));

    const parsed: ParsedLink = {
      path: 'file.ts',
      start: { line: 10, char: 6 }, // After "short" (position 6 = after all chars)
      end: { line: 10, char: 6 },
      linkType: LinkType.Regular,
      selectionType: SelectionType.Normal,
    };
    const linkText = 'file.ts#L10C6';

    // Act
    await handler.navigateToLink(parsed, linkText);

    // Assert: Should log that it's keeping cursor only
    const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
    const boundaryLog = debugCalls.find((call) => call[1]?.includes('keeping cursor only'));

    expect(boundaryLog).toBeDefined();
    expect(boundaryLog[0]).toMatchObject({
      fn: 'RangeLinkNavigationHandler.navigateToLink',
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
    mockDocument.lineAt = jest.fn(() => ({
      text: '', // Empty line
    }));

    const parsed: ParsedLink = {
      path: 'file.ts',
      start: { line: 5, char: 1 },
      end: { line: 5, char: 1 },
      linkType: LinkType.Regular,
      selectionType: SelectionType.Normal,
    };
    const linkText = 'file.ts#L5C1';

    // Act
    await handler.navigateToLink(parsed, linkText);

    // Assert: Should log that it's an empty line
    const debugCalls = (mockLogger.debug as jest.Mock).mock.calls;
    const boundaryLog = debugCalls.find((call) => call[1]?.includes('keeping cursor only'));

    expect(boundaryLog).toBeDefined();
    expect(boundaryLog[0]).toMatchObject({
      fn: 'RangeLinkNavigationHandler.navigateToLink',
      linkText: 'file.ts#L5C1',
      position: '5:1',
      lineLength: 0,
      reason: 'empty line',
    });
  });

  it('should extend line-only single position (no character specified)', async () => {
    // Arrange: Single line position (defaults to char 1 after conversion)
    const parsed: ParsedLink = {
      path: 'file.ts',
      start: { line: 20 }, // No char specified
      end: { line: 20 },
      linkType: LinkType.Regular,
      selectionType: SelectionType.Normal,
    };
    const linkText = 'file.ts#L20';

    // Act
    await handler.navigateToLink(parsed, linkText);

    // Assert: Should extend from start of line (char 1 → 0-indexed = 0) to character 1
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
    const parsed: ParsedLink = {
      path: 'file.ts',
      start: { line: 10 },
      end: { line: 20 }, // Different line
      linkType: LinkType.Regular,
      selectionType: SelectionType.Normal,
    };
    const linkText = 'file.ts#L10-L20';

    // Act
    await handler.navigateToLink(parsed, linkText);

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
