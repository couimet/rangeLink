import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS, RangeLinkErrorCodes, Result } from 'rangelink-core-ts';
import type { ParsedLink, RangeLinkError } from 'rangelink-core-ts';

import { AddBookmarkCommand } from '../../commands/AddBookmarkCommand';
import {
  createMockBookmarksStore,
  createMockEditor,
  createMockRangeLinkParser,
  createMockVscodeAdapter,
} from '../helpers';

describe('AddBookmarkCommand', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockParser: ReturnType<typeof createMockRangeLinkParser>;
  let mockBookmarksStore: ReturnType<typeof createMockBookmarksStore>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let command: AddBookmarkCommand;

  const TEST_LINK = 'src/foo.ts#L10-L20';

  const setupAdapterSpies = (adapter: ReturnType<typeof createMockVscodeAdapter>) => {
    jest.spyOn(adapter, 'showErrorMessage').mockResolvedValue(undefined);
    jest.spyOn(adapter, 'setStatusBarMessage').mockReturnValue({ dispose: jest.fn() });
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockParser = createMockRangeLinkParser();
    mockBookmarksStore = createMockBookmarksStore();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      mockAdapter = createMockVscodeAdapter();

      new AddBookmarkCommand(
        mockParser,
        DEFAULT_DELIMITERS,
        mockAdapter,
        mockBookmarksStore,
        mockLogger,
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'AddBookmarkCommand.constructor' },
        'AddBookmarkCommand initialized',
      );
    });
  });

  describe('execute()', () => {
    describe('no active editor', () => {
      it('shows error when no active editor', async () => {
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        setupAdapterSpies(mockAdapter);
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot add bookmark - no active editor',
        );
        expect(mockBookmarksStore.add).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'AddBookmarkCommand.execute' },
          'No active editor',
        );
      });
    });

    describe('selection is valid RangeLink', () => {
      it('uses existing link directly when selection is valid RangeLink', async () => {
        const editor = createMockEditor({
          text: TEST_LINK,
          selectionStart: { line: 0, character: 0 },
          selectionEnd: { line: 0, character: TEST_LINK.length },
        });
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('My Bookmark'),
          },
        });
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockBookmarksStore.add).toHaveBeenCalledWith({
          label: 'My Bookmark',
          link: TEST_LINK,
          scope: 'global',
        });
        expect(mockLogger.info).toHaveBeenCalledWith(
          { fn: 'AddBookmarkCommand.execute', source: 'existing-link', link: TEST_LINK },
          'Using existing link',
        );
      });

      it('uses existing link even when selection is in untitled file', async () => {
        const editor = createMockEditor({
          text: TEST_LINK,
          isUntitled: true,
          selectionStart: { line: 0, character: 0 },
          selectionEnd: { line: 0, character: TEST_LINK.length },
        });
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('Bookmark from Scratchpad'),
          },
        });
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockBookmarksStore.add).toHaveBeenCalledWith({
          label: 'Bookmark from Scratchpad',
          link: TEST_LINK,
          scope: 'global',
        });
      });

      it('parses multi-line selection that is a valid link', async () => {
        const multiLineLink = 'src/foo.ts#L10-L20';
        const editor = createMockEditor({
          text: `Here is the link:\n${multiLineLink}\nEnd of selection`,
          selectionStart: { line: 1, character: 0 },
          selectionEnd: { line: 1, character: multiLineLink.length },
        });
        editor.document.getText = jest.fn(() => multiLineLink);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('Multi-line Bookmark'),
          },
        });
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockBookmarksStore.add).toHaveBeenCalledWith({
          label: 'Multi-line Bookmark',
          link: multiLineLink,
          scope: 'global',
        });
      });
    });

    describe('selection is not a RangeLink - generate from selection', () => {
      it('generates link from selection in saved file', async () => {
        const editor = createMockEditor({
          text: 'const foo = "bar";',
          fsPath: '/Users/test/project/src/component.ts',
          selectionStart: { line: 9, character: 0 },
          selectionEnd: { line: 19, character: 0 },
        });
        mockParser.parseLink.mockReturnValueOnce(
          Result.err({
            name: 'RangeLinkError',
            code: RangeLinkErrorCodes.PARSE_NO_HASH_SEPARATOR,
            message: 'Link must contain # separator',
            functionName: 'parseLink',
          }) as Result<ParsedLink, RangeLinkError>,
        );
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('Generated Bookmark'),
          },
        });
        setupAdapterSpies(mockAdapter);
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockBookmarksStore.add).toHaveBeenCalledWith({
          label: 'Generated Bookmark',
          link: '/Users/test/project/src/component.ts#L10-L19',
          scope: 'global',
        });
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'AddBookmarkCommand.execute',
            source: 'generated',
            link: '/Users/test/project/src/component.ts#L10-L19',
            selectionCount: 1,
            isRectangular: false,
          },
          'Generated link from selection',
        );
      });

      it('generates link from rectangular selection (multiple selections)', async () => {
        const multiLineText = 'line 0\nline 1\nline 2\nline 3\nline 4';
        const lines = multiLineText.split('\n');
        const editor = {
          document: {
            uri: { fsPath: '/Users/test/project/src/columns.ts' },
            isUntitled: false,
            lineCount: lines.length,
            getText: jest.fn(() => 'col'),
            lineAt: jest.fn((line: number) => {
              const lineText = lines[line] || '';
              return {
                text: lineText,
                range: { end: { character: lineText.length } },
              };
            }),
          },
          selections: [
            {
              start: { line: 1, character: 0 },
              end: { line: 1, character: 3 },
              isEmpty: false,
              active: { line: 1, character: 0 },
            },
            {
              start: { line: 2, character: 0 },
              end: { line: 2, character: 3 },
              isEmpty: false,
              active: { line: 2, character: 0 },
            },
            {
              start: { line: 3, character: 0 },
              end: { line: 3, character: 3 },
              isEmpty: false,
              active: { line: 3, character: 0 },
            },
          ],
        };
        mockParser.parseLink.mockReturnValueOnce(
          Result.err({
            name: 'RangeLinkError',
            code: RangeLinkErrorCodes.PARSE_NO_HASH_SEPARATOR,
            message: 'Not a link',
            functionName: 'parseLink',
          }) as Result<ParsedLink, RangeLinkError>,
        );
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('Rectangular Selection'),
          },
        });
        setupAdapterSpies(mockAdapter);
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockBookmarksStore.add).toHaveBeenCalledWith({
          label: 'Rectangular Selection',
          link: '/Users/test/project/src/columns.ts##L2C1-L4C4',
          scope: 'global',
        });
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'AddBookmarkCommand.execute',
            source: 'generated',
            link: '/Users/test/project/src/columns.ts##L2C1-L4C4',
            selectionCount: 3,
            isRectangular: true,
          },
          'Generated link from selection',
        );
      });

      it('shows error when selection in untitled file is not a valid link', async () => {
        const editor = createMockEditor({
          text: 'const foo = "bar";',
          isUntitled: true,
        });
        mockParser.parseLink.mockReturnValueOnce(
          Result.err({
            name: 'RangeLinkError',
            code: RangeLinkErrorCodes.PARSE_NO_HASH_SEPARATOR,
            message: 'Link must contain # separator',
            functionName: 'parseLink',
          }) as Result<ParsedLink, RangeLinkError>,
        );
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: editor },
        });
        setupAdapterSpies(mockAdapter);
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot bookmark unsaved file. Save the file first, or select an existing RangeLink to bookmark.',
        );
        expect(mockBookmarksStore.add).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'AddBookmarkCommand.execute', reason: 'untitled-file' },
          'Cannot bookmark unsaved file',
        );
      });
    });

    describe('empty selection - rejected', () => {
      it('shows error when selection is empty (no text selected)', async () => {
        const editor = createMockEditor({
          text: 'const foo = "bar";',
          fsPath: '/Users/test/project/src/utils.ts',
          selectionStart: { line: 0, character: 5 },
          selectionEnd: { line: 0, character: 5 },
          isEmpty: true,
        });
        mockParser.parseLink.mockReturnValueOnce(
          Result.err({
            name: 'RangeLinkError',
            code: RangeLinkErrorCodes.PARSE_NO_HASH_SEPARATOR,
            message: 'Not a link',
            functionName: 'parseLink',
          }) as Result<ParsedLink, RangeLinkError>,
        );
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: editor },
        });
        setupAdapterSpies(mockAdapter);
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Cannot add bookmark - failed to generate link from selection',
        );
        expect(mockBookmarksStore.add).not.toHaveBeenCalled();
      });
    });

    describe('user cancels InputBox', () => {
      it('does not save bookmark when user cancels InputBox', async () => {
        const editor = createMockEditor({ text: TEST_LINK });
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue(undefined),
          },
        });
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockBookmarksStore.add).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'AddBookmarkCommand.execute', link: TEST_LINK },
          'User cancelled bookmark creation',
        );
      });
    });

    describe('empty label', () => {
      it('shows error when user enters empty label', async () => {
        const editor = createMockEditor({ text: TEST_LINK });
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('   '),
          },
        });
        setupAdapterSpies(mockAdapter);
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Bookmark label cannot be empty',
        );
        expect(mockBookmarksStore.add).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'AddBookmarkCommand.execute' },
          'Empty label provided',
        );
      });
    });

    describe('BookmarksStore.add() failure', () => {
      it('shows error when BookmarksStore.add() fails', async () => {
        const storageError = new Error('Storage quota exceeded');
        const editor = createMockEditor({ text: TEST_LINK });
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('Test Label'),
          },
        });
        setupAdapterSpies(mockAdapter);
        mockBookmarksStore.add.mockRejectedValue(storageError);
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: Failed to save bookmark',
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
          { fn: 'AddBookmarkCommand.execute', error: storageError },
          'Failed to save bookmark',
        );
      });
    });

    describe('successful bookmark creation', () => {
      it('shows status bar confirmation when bookmark is saved', async () => {
        const editor = createMockEditor({ text: TEST_LINK });
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('Success Bookmark'),
          },
        });
        setupAdapterSpies(mockAdapter);
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Bookmark saved: Success Bookmark',
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          { fn: 'AddBookmarkCommand.execute', label: 'Success Bookmark', link: TEST_LINK },
          'Bookmark saved',
        );
      });

      it('trims whitespace from label', async () => {
        const editor = createMockEditor({ text: TEST_LINK });
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('  Trimmed Label  '),
          },
        });
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockBookmarksStore.add).toHaveBeenCalledWith({
          label: 'Trimmed Label',
          link: TEST_LINK,
          scope: 'global',
        });
      });

      it('generates default label from link filename', async () => {
        const testLink = 'src/components/Button.tsx#L10';
        const editor = createMockEditor({ text: testLink });
        const capturedOptions: { value?: string; prompt?: string }[] = [];
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn((opts: { value?: string; prompt?: string }) => {
              capturedOptions.push(opts);
              return Promise.resolve('Final Label');
            }),
          },
        });
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(capturedOptions[0].value).toBe('Button.tsx');
        expect(capturedOptions[0].prompt).toBe(`Bookmark: ${testLink}`);
      });

      it('logs when showing bookmark label input', async () => {
        const editor = createMockEditor({ text: TEST_LINK });
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: editor,
            showInputBox: jest.fn().mockResolvedValue('Label'),
          },
        });
        command = new AddBookmarkCommand(
          mockParser,
          DEFAULT_DELIMITERS,
          mockAdapter,
          mockBookmarksStore,
          mockLogger,
        );

        await command.execute();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'AddBookmarkCommand.execute', link: TEST_LINK, defaultLabel: 'foo.ts' },
          'Showing bookmark label input',
        );
      });
    });
  });
});
