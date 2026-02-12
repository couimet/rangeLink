import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS, LinkType, SelectionType } from 'rangelink-core-ts';
import type { ParsedLink } from 'rangelink-core-ts';

import { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';

const GET_DELIMITERS = () => DEFAULT_DELIMITERS;
import {
  createMockDocument,
  createMockEditor,
  createMockLineAt,
  createMockPosition,
  createMockRange,
  createMockText,
  createMockUntitledUri,
  createMockUri,
  createMockVscodeAdapter,
  createWindowOptionsForEditor,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

describe('RangeLinkNavigationHandler', () => {
  let handler: RangeLinkNavigationHandler;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockDocument: ReturnType<typeof createMockDocument>;
  let mockEditor: ReturnType<typeof createMockEditor>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);
  });

  describe('Single Position Selection Extension', () => {
    let createSelectionSpy: jest.SpyInstance;

    beforeEach(() => {
      mockDocument = createMockDocument({
        getText: createMockText('const x = 42; // Sample line content'),
        uri: createMockUri('/test/file.ts'),
        lineCount: 100,
        lineAt: createMockLineAt('const x = 42; // Sample line content'),
      });

      mockEditor = createMockEditor({
        document: mockDocument,
      });

      mockAdapter = createMockVscodeAdapter({
        windowOptions: createWindowOptionsForEditor(mockEditor),
        workspaceOptions: {
          openTextDocument: jest
            .fn()
            .mockImplementation((uri: unknown) => Promise.resolve({ uri })),
        },
      });

      createSelectionSpy = jest.spyOn(mockAdapter, 'createSelection');
      handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);
    });

    it('should extend single-position selection by 1 character (normal case)', async () => {
      // Arrange: Single position at line 32, char 1
      const parsed: ParsedLink = {
        path: 'file.ts',
        quotedPath: 'file.ts',
        start: { line: 32, character: 1 },
        end: { line: 32, character: 1 }, // Same position
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
        quotedPath: 'file.ts',
        start: { line: 10, character: 6 }, // After "short" (position 6 = after all chars)
        end: { line: 10, character: 6 },
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
        quotedPath: 'file.ts',
        start: { line: 5, character: 1 },
        end: { line: 5, character: 1 },
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

    it('should select entire line for line-only notation (no character specified)', async () => {
      // Arrange: Single line position - this is full-line selection, not single-position
      const parsed: ParsedLink = {
        path: 'file.ts',
        quotedPath: 'file.ts',
        start: { line: 20 }, // No char specified = full line
        end: { line: 20 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'file.ts#L20';

      // Act
      await handler.navigateToLink(parsed, linkText);

      // Assert: Should log full-line selection (NOT single-position extension)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'file.ts#L20',
          startLine: 20,
          endLine: 20,
          endLineLength: 36,
          reason: 'full-line selection detected',
        },
        'Extended selection to full line(s)',
      );

      // Should create selection from start of line to end of line
      // Line content is 'const x = 42; // Sample line content' (36 chars)
      expect(createSelectionSpy).toHaveBeenCalledWith(
        { line: 19, character: 0 },
        { line: 19, character: 36 },
      );
    });

    it('should select from start of first line to end of last line for multi-line range', async () => {
      // Arrange: Multi-line range with no chars specified = full-line selection
      const parsed: ParsedLink = {
        path: 'file.ts',
        quotedPath: 'file.ts',
        start: { line: 10 },
        end: { line: 20 }, // Different line, no char = full lines
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'file.ts#L10-L20';

      // Act
      await handler.navigateToLink(parsed, linkText);

      // Assert: Should log full-line selection
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'file.ts#L10-L20',
          startLine: 10,
          endLine: 20,
          endLineLength: 36,
          reason: 'full-line selection detected',
        },
        'Extended selection to full line(s)',
      );

      // Should NOT trigger single-position extension
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.any(Object),
        'Extended single-position selection by 1 character',
      );

      // Should create selection from start of line 10 to END of line 20
      expect(createSelectionSpy).toHaveBeenCalledWith(
        { line: 9, character: 0 },
        { line: 19, character: 36 },
      );
    });

    it('should NOT use full-line selection when start has explicit char (#L10C5-L15)', async () => {
      // Arrange: Explicit start char means NOT full-line selection
      const parsed: ParsedLink = {
        path: 'file.ts',
        quotedPath: 'file.ts',
        start: { line: 10, character: 5 }, // Explicit char
        end: { line: 15 }, // No char
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'file.ts#L10C5-L15';

      // Act
      await handler.navigateToLink(parsed, linkText);

      // Assert: Should NOT log full-line selection (start.character is defined)
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.any(Object),
        'Extended selection to full line(s)',
      );

      // Should create selection from L10C5 to L15C0 (end defaults to 0)
      expect(createSelectionSpy).toHaveBeenCalledWith(
        { line: 9, character: 4 },
        { line: 14, character: 0 },
      );
    });

    it('should NOT use full-line selection when end has explicit char (#L10-L15C10)', async () => {
      // Arrange: Explicit end char means NOT full-line selection
      const parsed: ParsedLink = {
        path: 'file.ts',
        quotedPath: 'file.ts',
        start: { line: 10 }, // No char
        end: { line: 15, character: 10 }, // Explicit char
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'file.ts#L10-L15C10';

      // Act
      await handler.navigateToLink(parsed, linkText);

      // Assert: Should NOT log full-line selection (end.character is defined)
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.any(Object),
        'Extended selection to full line(s)',
      );

      // Should create selection from L10C0 to L15C10
      expect(createSelectionSpy).toHaveBeenCalledWith(
        { line: 9, character: 0 },
        { line: 14, character: 9 },
      );
    });

    it('should handle full-line selection on empty line', async () => {
      // Arrange: Mock empty line
      mockDocument.lineAt = createMockLineAt('');

      const parsed: ParsedLink = {
        path: 'file.ts',
        quotedPath: 'file.ts',
        start: { line: 5 },
        end: { line: 5 },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };
      const linkText = 'file.ts#L5';

      // Act
      await handler.navigateToLink(parsed, linkText);

      // Assert: Should still log full-line selection with length 0
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          linkText: 'file.ts#L5',
          startLine: 5,
          endLine: 5,
          endLineLength: 0,
          reason: 'full-line selection detected',
        },
        'Extended selection to full line(s)',
      );

      // Selection from 0 to 0 (empty line)
      expect(createSelectionSpy).toHaveBeenCalledWith(
        { line: 4, character: 0 },
        { line: 4, character: 0 },
      );
    });

    it('should call revealRange with createRange result and InCenterIfOutsideViewport (value 2)', async () => {
      // Arrange: Multi-line selection to avoid single-position extension path
      // Define 1-indexed values as they appear in the link
      const startLine = 10;
      const startChar = 5;
      const endLine = 15;
      const endChar = 10;

      const parsed: ParsedLink = {
        path: 'file.ts',
        quotedPath: 'file.ts',
        start: { line: startLine, character: startChar },
        end: { line: endLine, character: endChar },
        linkType: LinkType.Regular,
        selectionType: SelectionType.Normal,
      };

      const mockVsStart = createMockPosition({
        line: startLine - 1,
        character: startChar - 1,
      });
      const mockVsEnd = createMockPosition({
        line: endLine - 1,
        character: endChar - 1,
      });
      const mockRange = createMockRange({ start: mockVsStart, end: mockVsEnd });

      const createPositionSpy = jest
        .spyOn(mockAdapter, 'createPosition')
        .mockReturnValueOnce(mockVsStart)
        .mockReturnValueOnce(mockVsEnd);

      const createRangeSpy = jest.spyOn(mockAdapter, 'createRange').mockReturnValue(mockRange);

      // Act
      await handler.navigateToLink(
        parsed,
        `file.ts#L${startLine}C${startChar}-L${endLine}C${endChar}`,
      );

      expect(createPositionSpy).toHaveBeenCalledTimes(2);
      expect(createPositionSpy).toHaveBeenNthCalledWith(1, startLine - 1, startChar - 1);
      expect(createPositionSpy).toHaveBeenNthCalledWith(2, endLine - 1, endChar - 1);

      expect(createRangeSpy).toHaveBeenCalledTimes(1);
      expect(createRangeSpy).toHaveBeenCalledWith(mockVsStart, mockVsEnd);

      expect(mockEditor.revealRange).toHaveBeenCalledTimes(1);
      expect(mockEditor.revealRange).toHaveBeenCalledWith(mockRange, 2);
    });
  });

  describe('Untitled File Error Handling (Issue #16)', () => {
    describe('when path looks like untitled file AND file does not exist', () => {
      it('should show untitled-specific warning for "Untitled-1"', async () => {
        // Arrange: Path looks like untitled file and resolveWorkspacePath returns undefined
        const parsed: ParsedLink = {
          path: 'Untitled-1',
          quotedPath: 'Untitled-1',
          start: { line: 10, character: 5 },
          end: { line: 10, character: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };
        const linkText = 'Untitled-1#L10C5-L10C10';

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        // Act
        await handler.navigateToLink(parsed, linkText);

        // Assert: Should show untitled-specific warning (exact message)
        expect(mockShowWarningMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).toHaveBeenCalledWith(
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
          quotedPath: 'Untitled-2',
          start: { line: 5 },
          end: { line: 5 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        await handler.navigateToLink(parsed, 'Untitled-2#L5');

        expect(mockShowWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot navigate to unsaved file (Untitled-2). Save the file first, then try again.',
        );
      });

      it('should show untitled-specific warning for "untitled-1" (case-insensitive)', async () => {
        const parsed: ParsedLink = {
          path: 'untitled-1',
          quotedPath: 'untitled-1',
          start: { line: 1 },
          end: { line: 1 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        await handler.navigateToLink(parsed, 'untitled-1#L1');

        expect(mockShowWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot navigate to unsaved file (untitled-1). Save the file first, then try again.',
        );
      });

      it('should show untitled-specific warning for "Untitled" (no number)', async () => {
        const parsed: ParsedLink = {
          path: 'Untitled',
          quotedPath: 'Untitled',
          start: { line: 1 },
          end: { line: 1 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        await handler.navigateToLink(parsed, 'Untitled#L1');

        expect(mockShowWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot navigate to unsaved file (Untitled). Save the file first, then try again.',
        );
      });
    });

    describe('when path looks like untitled file BUT file exists', () => {
      it('should navigate successfully to real file named "Untitled-1"', async () => {
        // Arrange: Path looks like untitled but resolveWorkspacePath finds it
        const parsed: ParsedLink = {
          path: 'Untitled-1',
          quotedPath: 'Untitled-1',
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

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showWarningMessage: mockShowWarningMessage,
            showInformationMessage: mockShowInformationMessage,
          },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(mockDocument) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(mockUri);
        jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        // Act
        await handler.navigateToLink(parsed, linkText);

        // Assert: Should NOT show warning, should show success
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockShowInformationMessage).toHaveBeenCalledWith(
          'RangeLink: Navigated to Untitled-1 @ 10',
        );

        expect(mockEditor.revealRange).toHaveBeenCalledTimes(1);
        expect(mockEditor.revealRange).toHaveBeenCalledWith(
          expect.objectContaining({ start: expect.any(Object), end: expect.any(Object) }),
          2,
        );
      });
    });

    describe('when path does NOT look like untitled file AND file does not exist', () => {
      it('should show generic "file not found" warning for "src/missing.ts"', async () => {
        const parsed: ParsedLink = {
          path: 'src/missing.ts',
          quotedPath: 'src/missing.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        await handler.navigateToLink(parsed, 'src/missing.ts#L10');

        // Should show generic error (not untitled-specific)
        expect(mockShowWarningMessage).toHaveBeenCalledTimes(1);
        expect(mockShowWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot find file: src/missing.ts',
        );
      });

      it('should show generic error for absolute path "/tmp/missing.ts"', async () => {
        const parsed: ParsedLink = {
          path: '/tmp/missing.ts',
          quotedPath: '/tmp/missing.ts',
          start: { line: 1 },
          end: { line: 1 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        await handler.navigateToLink(parsed, '/tmp/missing.ts#L1');

        expect(mockShowWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot find file: /tmp/missing.ts',
        );
      });

      it('should show generic error for "MyUntitledFile.ts" (not untitled pattern)', async () => {
        const parsed: ParsedLink = {
          path: 'MyUntitledFile.ts',
          quotedPath: 'MyUntitledFile.ts',
          start: { line: 1 },
          end: { line: 1 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        await handler.navigateToLink(parsed, 'MyUntitledFile.ts#L1');

        // "MyUntitledFile" doesn't match /^Untitled-?\d*$/i pattern
        expect(mockShowWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot find file: MyUntitledFile.ts',
        );
      });
    });

    describe('when path looks like untitled AND file not saved BUT file is open', () => {
      it('should find and navigate to open untitled file "Untitled-1"', async () => {
        const parsed: ParsedLink = {
          path: 'Untitled-1',
          quotedPath: 'Untitled-1',
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

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showWarningMessage: mockShowWarningMessage,
            showInformationMessage: mockShowInformationMessage,
          },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(mockDocument) },
        });
        // File not saved (resolveWorkspacePath fails)
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        // But file is open (findOpenUntitledFile succeeds)
        jest.spyOn(mockAdapter, 'findOpenUntitledFile').mockReturnValue(untitledUri);
        jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        // Act
        await handler.navigateToLink(parsed, linkText);

        // Assert: Should find and navigate (no warning)
        expect(mockAdapter.findOpenUntitledFile).toHaveBeenCalledWith('Untitled-1');
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
        expect(mockShowInformationMessage).toHaveBeenCalledWith(
          'RangeLink: Navigated to Untitled-1 @ 10',
        );
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
          quotedPath: 'Untitled-2',
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

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(mockDocument) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        jest.spyOn(mockAdapter, 'findOpenUntitledFile').mockReturnValue(untitledUri);
        jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        await handler.navigateToLink(parsed, 'Untitled-2#L5');

        expect(mockAdapter.findOpenUntitledFile).toHaveBeenCalledWith('Untitled-2');
        expect(mockShowWarningMessage).not.toHaveBeenCalled();
      });

      it('should show error when untitled file not found in open documents', async () => {
        const parsed: ParsedLink = {
          path: 'Untitled-3',
          quotedPath: 'Untitled-3',
          start: { line: 1 },
          end: { line: 1 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showWarningMessage: mockShowWarningMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        // File not saved AND not open
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
        jest.spyOn(mockAdapter, 'findOpenUntitledFile').mockReturnValue(undefined);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        await handler.navigateToLink(parsed, 'Untitled-3#L1');

        // Should try to find it first
        expect(mockAdapter.findOpenUntitledFile).toHaveBeenCalledWith('Untitled-3');
        // Then show error (ultimate last resort)
        expect(mockShowWarningMessage).toHaveBeenCalledWith(
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

  describe('parseLink and Error Handling', () => {
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

    describe('Error Handling', () => {
      it('should re-throw showTextDocument errors and show error message', async () => {
        const parsed: ParsedLink = {
          path: 'file.ts',
          quotedPath: 'file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };
        const linkText = 'file.ts#L10';

        const mockUri = createMockUri('/test/file.ts');
        const showTextDocumentError = new Error('Failed to open document');

        const mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showErrorMessage: mockShowErrorMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(mockUri);
        jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(showTextDocumentError);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

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
        expect(mockShowErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Failed to navigate to file.ts: Failed to open document',
        );
      });

      it('should re-throw non-Error exceptions and show error message', async () => {
        const parsed: ParsedLink = {
          path: 'file.ts',
          quotedPath: 'file.ts',
          start: { line: 10 },
          end: { line: 10 },
          linkType: LinkType.Regular,
          selectionType: SelectionType.Normal,
        };

        const mockUri = createMockUri('/test/file.ts');
        const nonErrorException = 'string error';

        const mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showErrorMessage: mockShowErrorMessage },
          workspaceOptions: { openTextDocument: jest.fn().mockResolvedValue(undefined) },
        });
        jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(mockUri);
        jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(nonErrorException);
        handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);

        // Should re-throw the exact same exception value (reference equality)
        await expect(handler.navigateToLink(parsed, 'file.ts#L10')).rejects.toBe(nonErrorException);

        // Should handle non-Error exception and show error message
        expect(mockShowErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Failed to navigate to file.ts: string error',
        );
      });
    });
  });

  describe('Rectangular Selection Mode', () => {
    beforeEach(() => {
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

      handler = new RangeLinkNavigationHandler(GET_DELIMITERS, mockAdapter, mockLogger);
    });

    it('should create multi-cursor selections for rectangular mode', async () => {
      const parsed: ParsedLink = {
        path: 'file.ts',
        quotedPath: 'file.ts',
        start: { line: 10, character: 5 },
        end: { line: 12, character: 10 }, // 3 lines: 10, 11, 12
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
        quotedPath: 'file.ts',
        start: { line: 5, character: 1 },
        end: { line: 7, character: 8 }, // 3 lines
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
});
