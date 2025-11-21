import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import { LinkType, SelectionType, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import type { ParsedLink } from 'rangelink-core-ts';

import { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import { createMockDocument } from '../helpers/createMockDocument';
import { createMockEditor } from '../helpers/createMockEditor';
import { createMockLineAt } from '../helpers/createMockLineAt';
import { createMockText } from '../helpers/createMockText';
import { createMockUri } from '../helpers/createMockUri';
import { createMockUntitledUri } from '../helpers/createMockUntitledUri';
import { createWindowOptionsForEditor } from '../helpers/createWindowOptionsForEditor';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers/mockVSCode';

let handler: RangeLinkNavigationHandler;
let mockLogger: Logger;
let mockAdapter: VscodeAdapterWithTestHooks;
let mockDocument: ReturnType<typeof createMockDocument>;
let mockEditor: ReturnType<typeof createMockEditor>;
let createSelectionSpy: jest.SpyInstance;

describe('RangeLinkNavigationHandler - Single Position Selection Extension', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();

    // Create mock document with navigation-specific overrides
    mockDocument = createMockDocument({
      getText: createMockText('const x = 42; // Sample line content'),
      uri: createMockUri('/test/file.ts'),
      lineCount: 100,
      lineAt: createMockLineAt('const x = 42; // Sample line content'),
    });

    // Create mock editor with our custom document
    mockEditor = createMockEditor({
      document: mockDocument,
    });

    // Create adapter with window/workspace configuration
    // mockEditor/mockDocument are created above, so we can reference them in options
    mockAdapter = createMockVscodeAdapter({
      windowOptions: createWindowOptionsForEditor(mockEditor),
      workspaceOptions: {
        openTextDocument: jest.fn().mockImplementation((uri: unknown) => Promise.resolve({ uri })),
      },
    });

    // Spy on VscodeAdapter's createSelection method to verify it's called correctly
    // This respects the abstraction layer - we test the adapter's public API, not its internals
    createSelectionSpy = jest.spyOn(mockAdapter, 'createSelection');

    handler = new RangeLinkNavigationHandler(DEFAULT_DELIMITERS, mockAdapter, mockLogger);
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

    // Should call adapter's createSelection with extended positions (31,0) to (31,1) in 0-indexed coords
    expect(createSelectionSpy).toHaveBeenCalledWith(
      { line: 31, character: 0 },
      { line: 31, character: 1 },
    );
  });

  it('should NOT extend when at end of line', async () => {
    // Arrange: Mock line with specific length
    mockDocument.lineAt = createMockLineAt('short'); // 5 characters (0-4)

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
    expect(createSelectionSpy).toHaveBeenCalledWith(
      { line: 9, character: 5 },
      { line: 9, character: 5 }, // Same position
    );
  });

  it('should NOT extend on empty line', async () => {
    // Arrange: Mock empty line
    mockDocument.lineAt = createMockLineAt(''); // Empty line

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
    expect(createSelectionSpy).toHaveBeenCalledWith(
      { line: 9, character: 0 }, // 0-indexed
      { line: 19, character: 0 }, // 0-indexed
    );
  });
});

describe('RangeLinkNavigationHandler - Untitled File Error Handling (Issue #16)', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();

    handler = new RangeLinkNavigationHandler(DEFAULT_DELIMITERS, mockAdapter, mockLogger);
  });

  describe('when path looks like untitled file AND file does not exist', () => {
    it('should show untitled-specific warning for "Untitled-1"', async () => {
      // Arrange: Path looks like untitled file and resolveWorkspacePath returns undefined
      const parsed: ParsedLink = {
        path: 'Untitled-1',
        start: { line: 10, char: 5 },
        end: { line: 10, char: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'Untitled-1#L10C5-L10C10';

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      // Act
      await handler.navigateToLink(parsed, linkText);

      // Assert: Should show untitled-specific warning (exact message)
      expect(showWarningSpy).toHaveBeenCalledTimes(1);
      expect(showWarningSpy).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate to unsaved file (Untitled-1). Save the file first, then try again.',
      );

      // Should log with info level (not warning - expected behavior)
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'Untitled-1#L10C5-L10C10',
          path: 'Untitled-1',
        },
        'Path looks like untitled file but not found in open documents',
      );
    });

    it('should show untitled-specific warning for "Untitled-2"', async () => {
      const parsed: ParsedLink = {
        path: 'Untitled-2',
        start: { line: 5 },
        end: { line: 5 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      await handler.navigateToLink(parsed, 'Untitled-2#L5');

      expect(showWarningSpy).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate to unsaved file (Untitled-2). Save the file first, then try again.',
      );
    });

    it('should show untitled-specific warning for "untitled-1" (case-insensitive)', async () => {
      const parsed: ParsedLink = {
        path: 'untitled-1',
        start: { line: 1 },
        end: { line: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      await handler.navigateToLink(parsed, 'untitled-1#L1');

      expect(showWarningSpy).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate to unsaved file (untitled-1). Save the file first, then try again.',
      );
    });

    it('should show untitled-specific warning for "Untitled" (no number)', async () => {
      const parsed: ParsedLink = {
        path: 'Untitled',
        start: { line: 1 },
        end: { line: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      await handler.navigateToLink(parsed, 'Untitled#L1');

      expect(showWarningSpy).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate to unsaved file (Untitled). Save the file first, then try again.',
      );
    });
  });

  describe('when path looks like untitled file BUT file exists', () => {
    it('should navigate successfully to real file named "Untitled-1"', async () => {
      // Arrange: Path looks like untitled but resolveWorkspacePath finds it
      const parsed: ParsedLink = {
        path: 'Untitled-1',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'Untitled-1#L10';

      const mockUri = createMockUri('/workspace/Untitled-1');
      const mockDocument = createMockDocument({
        uri: mockUri,
        getText: createMockText('real file content'),
        lineAt: createMockLineAt('real file content'),
      });
      const mockEditor = createMockEditor({ document: mockDocument });

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(mockUri);
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      // Act
      await handler.navigateToLink(parsed, linkText);

      // Assert: Should NOT show warning, should show success
      expect(showWarningSpy).not.toHaveBeenCalled();
      expect(showInfoSpy).toHaveBeenCalledWith('RangeLink: Navigated to Untitled-1 @ 10');
    });
  });

  describe('when path does NOT look like untitled file AND file does not exist', () => {
    it('should show generic "file not found" warning for "src/missing.ts"', async () => {
      const parsed: ParsedLink = {
        path: 'src/missing.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      await handler.navigateToLink(parsed, 'src/missing.ts#L10');

      // Should show generic error (not untitled-specific)
      expect(showWarningSpy).toHaveBeenCalledTimes(1);
      expect(showWarningSpy).toHaveBeenCalledWith('RangeLink: Cannot find file: src/missing.ts');
    });

    it('should show generic error for absolute path "/tmp/missing.ts"', async () => {
      const parsed: ParsedLink = {
        path: '/tmp/missing.ts',
        start: { line: 1 },
        end: { line: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      await handler.navigateToLink(parsed, '/tmp/missing.ts#L1');

      expect(showWarningSpy).toHaveBeenCalledWith('RangeLink: Cannot find file: /tmp/missing.ts');
    });

    it('should show generic error for "MyUntitledFile.ts" (not untitled pattern)', async () => {
      const parsed: ParsedLink = {
        path: 'MyUntitledFile.ts',
        start: { line: 1 },
        end: { line: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      await handler.navigateToLink(parsed, 'MyUntitledFile.ts#L1');

      // "MyUntitledFile" doesn't match /^Untitled-?\d*$/i pattern
      expect(showWarningSpy).toHaveBeenCalledWith('RangeLink: Cannot find file: MyUntitledFile.ts');
    });
  });

  describe('when path looks like untitled AND file not saved BUT file is open', () => {
    it('should find and navigate to open untitled file "Untitled-1"', async () => {
      const parsed: ParsedLink = {
        path: 'Untitled-1',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'Untitled-1#L10';

      const untitledUri = createMockUntitledUri('untitled:/1');
      const mockDocument = createMockDocument({
        uri: untitledUri,
        getText: createMockText('open untitled file content'),
        lineAt: createMockLineAt('open untitled file content'),
      });
      const mockEditor = createMockEditor({ document: mockDocument });

      // File not saved (resolveWorkspacePath fails)
      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      // But file is open (findOpenUntitledFile succeeds)
      jest.spyOn(mockAdapter, 'findOpenUntitledFile').mockReturnValue(untitledUri);
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');
      const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');

      // Act
      await handler.navigateToLink(parsed, linkText);

      // Assert: Should find and navigate (no warning)
      expect(mockAdapter.findOpenUntitledFile).toHaveBeenCalledWith('Untitled-1');
      expect(showWarningSpy).not.toHaveBeenCalled();
      expect(showInfoSpy).toHaveBeenCalledWith('RangeLink: Navigated to Untitled-1 @ 10');
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'Untitled-1#L10',
          path: 'Untitled-1',
          uri: 'untitled:/1',
        },
        'Found open untitled file, navigating',
      );
    });

    it('should find and navigate to open untitled file "Untitled-2"', async () => {
      const parsed: ParsedLink = {
        path: 'Untitled-2',
        start: { line: 5 },
        end: { line: 5 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      const untitledUri = createMockUntitledUri('untitled:/2');
      const mockDocument = createMockDocument({
        uri: untitledUri,
        getText: createMockText('content'),
        lineAt: createMockLineAt('content'),
      });
      const mockEditor = createMockEditor({ document: mockDocument });

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      jest.spyOn(mockAdapter, 'findOpenUntitledFile').mockReturnValue(untitledUri);
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      await handler.navigateToLink(parsed, 'Untitled-2#L5');

      expect(mockAdapter.findOpenUntitledFile).toHaveBeenCalledWith('Untitled-2');
      expect(showWarningSpy).not.toHaveBeenCalled();
    });

    it('should show error when untitled file not found in open documents', async () => {
      const parsed: ParsedLink = {
        path: 'Untitled-3',
        start: { line: 1 },
        end: { line: 1 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      // File not saved AND not open
      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      jest.spyOn(mockAdapter, 'findOpenUntitledFile').mockReturnValue(undefined);
      const showWarningSpy = jest.spyOn(mockAdapter, 'showWarningMessage');

      await handler.navigateToLink(parsed, 'Untitled-3#L1');

      // Should try to find it first
      expect(mockAdapter.findOpenUntitledFile).toHaveBeenCalledWith('Untitled-3');
      // Then show error (ultimate last resort)
      expect(showWarningSpy).toHaveBeenCalledWith(
        'RangeLink: Cannot navigate to unsaved file (Untitled-3). Save the file first, then try again.',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'Untitled-3#L1',
          path: 'Untitled-3',
        },
        'Path looks like untitled file but not found in open documents',
      );
    });
  });
});
