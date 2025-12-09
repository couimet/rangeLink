import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import { LinkType, SelectionType, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import type { ParsedLink } from 'rangelink-core-ts';

import { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';
import * as formatLinkTooltipModule from '../../utils/formatLinkTooltip';
import { createMockDocument } from '../helpers/createMockDocument';
import { createMockEditor } from '../helpers/createMockEditor';
import { createMockLineAt } from '../helpers/createMockLineAt';
import { createMockText } from '../helpers/createMockText';
import { createMockUntitledUri } from '../helpers/createMockUntitledUri';
import { createMockUri } from '../helpers/createMockUri';
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
    expect(mockLogger.debug).toHaveBeenCalledWith(
      {
        fn: 'RangeLinkNavigationHandler.navigateToLink',
        linkText: 'file.ts#L32C1',
        originalPos: '32:1',
        extendedTo: '32:2',
        reason: 'single-position selection needs visibility',
      },
      'Extended single-position selection by 1 character',
    );

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
    expect(mockLogger.debug).toHaveBeenCalledWith(
      {
        fn: 'RangeLinkNavigationHandler.navigateToLink',
        linkText: 'file.ts#L10C6',
        position: '10:6',
        lineLength: 5,
        reason: 'end of line',
      },
      'Single-position selection at line boundary - keeping cursor only',
    );

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
    expect(mockLogger.debug).toHaveBeenCalledWith(
      {
        fn: 'RangeLinkNavigationHandler.navigateToLink',
        linkText: 'file.ts#L5C1',
        position: '5:1',
        lineLength: 0,
        reason: 'empty line',
      },
      'Single-position selection at line boundary - keeping cursor only',
    );
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
    expect(mockLogger.debug).toHaveBeenCalledWith(
      {
        fn: 'RangeLinkNavigationHandler.navigateToLink',
        linkText: 'file.ts#L20',
        originalPos: '20:1',
        extendedTo: '20:2',
        reason: 'single-position selection needs visibility',
      },
      'Extended single-position selection by 1 character',
    );
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
    expect(mockLogger.debug).not.toHaveBeenCalledWith(
      expect.any(Object),
      'Extended single-position selection by 1 character',
    );

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

describe('RangeLinkNavigationHandler - Wrapper Methods and Error Handling', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    handler = new RangeLinkNavigationHandler(DEFAULT_DELIMITERS, mockAdapter, mockLogger);
  });

  describe('getPattern', () => {
    it('should return compiled RegExp pattern', () => {
      const pattern = handler.getPattern();

      expect(pattern).toBeInstanceOf(RegExp);
      expect(pattern.global).toBe(true); // Should be global for matchAll
    });

    it('should return pattern that matches RangeLink formats', () => {
      const pattern = handler.getPattern();

      expect('file.ts#L10').toMatch(pattern);
      expect('file.ts#L10-L20').toMatch(pattern);
      expect('file.ts#L10C5-L20C10').toMatch(pattern);
      expect('file.ts##L10C5-L20C10').toMatch(pattern);
    });
  });

  describe('parseLink', () => {
    it('should parse valid link and return success result', () => {
      const result = handler.parseLink('file.ts#L10');

      expect(result).toBeOkWith((value: ParsedLink) => {
        expect(value.path).toBe('file.ts');
        expect(value.start.line).toBe(10);
        expect(value.end.line).toBe(10);
      });
    });

    it('should return error for invalid link', () => {
      const result = handler.parseLink('invalid');

      expect(result).toBeRangeLinkErrorErr('PARSE_NO_HASH_SEPARATOR', {
        message: 'Link must contain # separator',
        functionName: 'parseLink',
      });
    });
  });

  describe('formatTooltip', () => {
    it('should delegate to formatLinkTooltip utility and return result exactly', () => {
      const parsed: ParsedLink = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const expectedTooltip = 'Open file.ts:10 • RangeLink';

      // Mock the utility function
      const formatLinkTooltipSpy = jest
        .spyOn(formatLinkTooltipModule, 'formatLinkTooltip')
        .mockReturnValue(expectedTooltip);

      const result = handler.formatTooltip(parsed);

      // Verify delegation with exact parameter
      expect(formatLinkTooltipSpy).toHaveBeenCalledTimes(1);
      expect(formatLinkTooltipSpy).toHaveBeenCalledWith(parsed);

      // Verify return value is passed through exactly
      expect(result).toBe(expectedTooltip);
    });

    it('should pass through undefined return value from formatLinkTooltip', () => {
      const invalidParsed = {
        path: '',
        start: { line: 10 },
        end: { line: 10 },
      } as ParsedLink;

      // Mock utility to return undefined (invalid data case)
      const formatLinkTooltipSpy = jest
        .spyOn(formatLinkTooltipModule, 'formatLinkTooltip')
        .mockReturnValue(undefined);

      const result = handler.formatTooltip(invalidParsed);

      // Verify delegation
      expect(formatLinkTooltipSpy).toHaveBeenCalledWith(invalidParsed);

      // Verify undefined is passed through exactly
      expect(result).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should re-throw showTextDocument errors and show error message', async () => {
      const parsed: ParsedLink = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'file.ts#L10';

      const mockUri = createMockUri('/test/file.ts');
      const showTextDocumentError = new Error('Failed to open document');

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(mockUri);
      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(showTextDocumentError);
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');

      // Should re-throw the exact same error object (reference equality)
      await expect(handler.navigateToLink(parsed, linkText)).rejects.toBe(showTextDocumentError);

      // Should log error
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'file.ts#L10',
          error: showTextDocumentError,
        },
        'Navigation failed',
      );

      // Should show error message to user
      expect(showErrorSpy).toHaveBeenCalledWith(
        'RangeLink: Failed to navigate to file.ts: Failed to open document',
      );
    });

    it('should re-throw non-Error exceptions and show error message', async () => {
      const parsed: ParsedLink = {
        path: 'file.ts',
        start: { line: 10 },
        end: { line: 10 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      const mockUri = createMockUri('/test/file.ts');
      const nonErrorException = 'string error';

      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(mockUri);
      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(nonErrorException);
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');

      // Should re-throw the exact same exception value (reference equality)
      await expect(handler.navigateToLink(parsed, 'file.ts#L10')).rejects.toBe(nonErrorException);

      // Should handle non-Error exception and show error message
      expect(showErrorSpy).toHaveBeenCalledWith(
        'RangeLink: Failed to navigate to file.ts: string error',
      );
    });
  });
});

describe('RangeLinkNavigationHandler - Rectangular Selection Mode', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();

    mockDocument = createMockDocument({
      getText: createMockText('line content'),
      uri: createMockUri('/test/file.ts'),
      lineCount: 100,
      lineAt: createMockLineAt('line content'),
    });

    mockEditor = createMockEditor({
      document: mockDocument,
    });

    mockAdapter = createMockVscodeAdapter({
      windowOptions: createWindowOptionsForEditor(mockEditor),
      workspaceOptions: {
        openTextDocument: jest.fn().mockResolvedValue({ uri: mockDocument.uri }),
      },
    });

    handler = new RangeLinkNavigationHandler(DEFAULT_DELIMITERS, mockAdapter, mockLogger);
  });

  it('should create multi-cursor selections for rectangular mode', async () => {
    const parsed: ParsedLink = {
      path: 'file.ts',
      start: { line: 10, char: 5 },
      end: { line: 12, char: 10 }, // 3 lines: 10, 11, 12
      linkType: LinkType.Regular,
      selectionType: SelectionType.Rectangular,
    };
    const linkText = 'file.ts##L10C5-L12C10';

    await handler.navigateToLink(parsed, linkText);

    // Should log rectangular selection
    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        fn: 'RangeLinkNavigationHandler.navigateToLink',
        linkText: 'file.ts##L10C5-L12C10',
        lineCount: 3, // Lines 10, 11, 12
      },
      'Set rectangular selection (multi-cursor)',
    );

    // Should set editor.selections (not editor.selection)
    expect(mockEditor.selections).toBeDefined();
    expect(mockEditor.selections).toHaveLength(3);
  });

  it('should create selections for each line in rectangular range', async () => {
    const parsed: ParsedLink = {
      path: 'file.ts',
      start: { line: 5, char: 1 },
      end: { line: 7, char: 8 }, // 3 lines
      linkType: LinkType.Regular,
      selectionType: SelectionType.Rectangular,
    };

    const createSelectionSpy = jest.spyOn(mockAdapter, 'createSelection');

    await handler.navigateToLink(parsed, 'file.ts##L5C1-L7C8');

    // Should create 3 selections (one per line)
    expect(createSelectionSpy).toHaveBeenCalledTimes(3);

    // Line 5 (0-indexed: line 4)
    expect(createSelectionSpy).toHaveBeenCalledWith(
      { line: 4, character: 0 }, // Line 5, char 1 → 0-indexed
      { line: 4, character: 7 }, // Line 5, char 8 → 0-indexed
    );

    // Line 6 (0-indexed: line 5)
    expect(createSelectionSpy).toHaveBeenCalledWith(
      { line: 5, character: 0 },
      { line: 5, character: 7 },
    );

    // Line 7 (0-indexed: line 6)
    expect(createSelectionSpy).toHaveBeenCalledWith(
      { line: 6, character: 0 },
      { line: 6, character: 7 },
    );
  });
});
