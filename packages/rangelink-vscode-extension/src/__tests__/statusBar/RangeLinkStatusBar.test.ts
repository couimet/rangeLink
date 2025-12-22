import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import type { Bookmark } from '../../bookmarks';
import { RangeLinkStatusBar } from '../../statusBar/RangeLinkStatusBar';
import {
  createMockBookmarksStore,
  createMockClipboard,
  createMockDestinationManager,
  createMockStatusBarItem,
  createMockTerminalPasteDestination,
  createMockVscodeAdapter,
} from '../helpers';

/**
 * Semantic constant for when user dismisses QuickPick (Escape or click outside).
 * VSCode's showQuickPick returns undefined in this case.
 */
const QUICK_PICK_DISMISSED = undefined;

describe('RangeLinkStatusBar', () => {
  let createStatusBarItemMock: jest.Mock;
  let showQuickPickMock: jest.Mock;
  let executeCommandMock: jest.Mock;
  let mockStatusBarItem: ReturnType<typeof createMockStatusBarItem>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockBookmarksStore: ReturnType<typeof createMockBookmarksStore>;

  beforeEach(() => {
    mockStatusBarItem = createMockStatusBarItem();
    mockLogger = createMockLogger();
    createStatusBarItemMock = jest.fn(() => mockStatusBarItem);
    showQuickPickMock = jest.fn().mockResolvedValue(undefined);
    executeCommandMock = jest.fn().mockResolvedValue(undefined);
    mockAdapter = createMockVscodeAdapter({
      windowOptions: {
        createStatusBarItem: createStatusBarItemMock,
        showQuickPick: showQuickPickMock,
      },
      commandsOptions: {
        executeCommand: executeCommandMock,
      },
    });
    mockDestinationManager = createMockDestinationManager();
    mockBookmarksStore = createMockBookmarksStore();
  });

  describe('constructor', () => {
    it('creates and configures status bar item', () => {
      new RangeLinkStatusBar(mockAdapter, mockDestinationManager, mockBookmarksStore, mockLogger);

      expect(createStatusBarItemMock).toHaveBeenCalledTimes(1);
      expect(createStatusBarItemMock).toHaveBeenCalledWith(vscode.StatusBarAlignment.Right, 100);
      expect(mockStatusBarItem.text).toBe('$(link) RangeLink');
      expect(mockStatusBarItem.tooltip).toBe('RangeLink Menu');
      expect(mockStatusBarItem.command).toBe('rangelink.openStatusBarMenu');
      expect(mockStatusBarItem.show).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.constructor' },
        'Status bar item created',
      );
    });
  });

  /**
   * Menu content tests: Verify exact items passed to QuickPick.
   * These freeze the user-facing contract (labels, descriptions, commands).
   */
  describe('openMenu - menu content', () => {
    it('shows disabled Jump item and empty bookmarks when no destination is bound', async () => {
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledTimes(1);
      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: '$(circle-slash) Jump to Bound Destination',
            description: '(no destination bound)',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(bookmark) Bookmarks', kind: vscode.QuickPickItemKind.Separator },
          { label: '    No bookmarks yet' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '    $(add) Add Current Selection', command: 'rangelink.bookmark.add' },
          { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(info) Show Version Info', command: 'rangelink.showVersion' },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });

    it('shows enabled Jump item when destination is bound', async () => {
      const mockBoundDestination = createMockTerminalPasteDestination({
        displayName: 'Terminal ("zsh")',
      });
      const boundDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: mockBoundDestination,
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        boundDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: '$(arrow-right) Jump to Bound Destination',
            description: '→ Terminal ("zsh")',
            command: 'rangelink.jumpToBoundDestination',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(bookmark) Bookmarks', kind: vscode.QuickPickItemKind.Separator },
          { label: '    No bookmarks yet' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '    $(add) Add Current Selection', command: 'rangelink.bookmark.add' },
          { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(info) Show Version Info', command: 'rangelink.showVersion' },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });

    it('shows bookmark items with count in section header', async () => {
      const bookmarksStoreWithItems = createMockBookmarksStore({
        bookmarks: [
          {
            id: 'bookmark-1',
            label: 'CLAUDE.md Instructions',
            link: '/Users/test/project/CLAUDE.md#L10-L20',
            description: 'Important rules',
            scope: 'global',
            createdAt: '2025-01-15T10:00:00.000Z',
            accessCount: 5,
          },
          {
            id: 'bookmark-2',
            label: 'API Error Codes',
            link: '/Users/test/project/src/errors.ts#L1-L50',
            scope: 'global',
            createdAt: '2025-01-14T10:00:00.000Z',
            accessCount: 2,
          },
        ],
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        bookmarksStoreWithItems,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: '$(circle-slash) Jump to Bound Destination',
            description: '(no destination bound)',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(bookmark) Bookmarks (2)', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '    $(file) CLAUDE.md Instructions',
            description: 'Important rules',
            command: 'rangelink.bookmark.navigate',
            bookmarkId: 'bookmark-1',
          },
          {
            label: '    $(file) API Error Codes',
            description: undefined,
            command: 'rangelink.bookmark.navigate',
            bookmarkId: 'bookmark-2',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '    $(add) Add Current Selection', command: 'rangelink.bookmark.add' },
          { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(info) Show Version Info', command: 'rangelink.showVersion' },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });
  });

  /**
   * Selection behavior tests: Verify openMenu() handles selections correctly.
   * Uses synthetic items (not real menu items) to test the `if (selected?.command)` logic
   * independently of actual menu content.
   */
  describe('openMenu - selection behavior', () => {
    it('executes command and logs when item with command is selected', async () => {
      showQuickPickMock.mockResolvedValue({
        label: 'Synthetic Item',
        command: 'synthetic.testCommand',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(executeCommandMock).toHaveBeenCalledTimes(1);
      expect(executeCommandMock).toHaveBeenCalledWith('synthetic.testCommand');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: { label: 'Synthetic Item', command: 'synthetic.testCommand' },
        },
        'Menu item selected',
      );
    });

    it('does not execute command or log when item without command is selected', async () => {
      showQuickPickMock.mockResolvedValue({
        label: 'Synthetic Disabled Item',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );
      (mockLogger.debug as jest.Mock).mockClear();

      await statusBar.openMenu();

      expect(executeCommandMock).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('does not execute command or log when user dismisses QuickPick', async () => {
      showQuickPickMock.mockResolvedValue(QUICK_PICK_DISMISSED);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );
      (mockLogger.debug as jest.Mock).mockClear();

      await statusBar.openMenu();

      expect(executeCommandMock).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('openMenu - bookmark selection', () => {
    it('copies bookmark link to clipboard and pastes to bound destination', async () => {
      const mockBoundDestination = createMockTerminalPasteDestination({
        displayName: 'Terminal ("zsh")',
      });
      const boundDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: mockBoundDestination,
      });
      const bookmark: Bookmark = {
        id: 'bookmark-1',
        label: 'Test Bookmark',
        link: '/Users/test/project/file.ts#L10-L20',
        scope: 'global',
        createdAt: '2025-01-15T10:00:00.000Z',
        accessCount: 0,
      };
      const bookmarksStoreWithItem = createMockBookmarksStore({ bookmarks: [bookmark] });
      const clipboardWriteTextMock = jest.fn().mockResolvedValue(undefined);
      const mockClipboard = createMockClipboard({ writeText: clipboardWriteTextMock });
      const adapterWithClipboard = createMockVscodeAdapter({
        windowOptions: {
          createStatusBarItem: createStatusBarItemMock,
          showQuickPick: showQuickPickMock,
        },
        commandsOptions: {
          executeCommand: executeCommandMock,
        },
        envOptions: {
          clipboard: mockClipboard,
        },
      });

      showQuickPickMock.mockResolvedValue({
        label: '    $(file) Test Bookmark',
        command: 'rangelink.bookmark.navigate',
        bookmarkId: 'bookmark-1',
      });
      const statusBar = new RangeLinkStatusBar(
        adapterWithClipboard,
        boundDestinationManager,
        bookmarksStoreWithItem,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(bookmarksStoreWithItem.recordAccess).toHaveBeenCalledWith('bookmark-1');
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('/Users/test/project/file.ts#L10-L20');
      expect(boundDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
        '/Users/test/project/file.ts#L10-L20',
        'Bookmark pasted: Test Bookmark',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.pasteBookmarkToDestination',
          bookmark,
          pastedToDestination: true,
        },
        'Pasted bookmark to destination: Test Bookmark',
      );
    });

    it('copies bookmark link to clipboard without pasting when no destination bound', async () => {
      const bookmark: Bookmark = {
        id: 'bookmark-1',
        label: 'Test Bookmark',
        link: '/Users/test/project/file.ts#L10-L20',
        scope: 'global',
        createdAt: '2025-01-15T10:00:00.000Z',
        accessCount: 0,
      };
      const bookmarksStoreWithItem = createMockBookmarksStore({ bookmarks: [bookmark] });
      const clipboardWriteTextMock = jest.fn().mockResolvedValue(undefined);
      const mockClipboard = createMockClipboard({ writeText: clipboardWriteTextMock });
      const adapterWithClipboard = createMockVscodeAdapter({
        windowOptions: {
          createStatusBarItem: createStatusBarItemMock,
          showQuickPick: showQuickPickMock,
        },
        commandsOptions: {
          executeCommand: executeCommandMock,
        },
        envOptions: {
          clipboard: mockClipboard,
        },
      });

      showQuickPickMock.mockResolvedValue({
        label: '    $(file) Test Bookmark',
        command: 'rangelink.bookmark.navigate',
        bookmarkId: 'bookmark-1',
      });
      const statusBar = new RangeLinkStatusBar(
        adapterWithClipboard,
        mockDestinationManager,
        bookmarksStoreWithItem,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(bookmarksStoreWithItem.recordAccess).toHaveBeenCalledWith('bookmark-1');
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('/Users/test/project/file.ts#L10-L20');
      expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.pasteBookmarkToDestination',
          bookmark,
          pastedToDestination: false,
        },
        'Copied bookmark to clipboard (no destination bound): Test Bookmark',
      );
    });

    it('logs warning when selected bookmark not found', async () => {
      showQuickPickMock.mockResolvedValue({
        label: '    $(file) Deleted Bookmark',
        command: 'rangelink.bookmark.navigate',
        bookmarkId: 'non-existent-id',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.pasteBookmarkToDestination', bookmarkId: 'non-existent-id' },
        'Bookmark not found',
      );
      expect(mockBookmarksStore.recordAccess).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('disposes status bar item and logs', () => {
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );

      statusBar.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.dispose' },
        'Status bar disposed',
      );
    });
  });

  describe('buildBookmarksQuickPickItems', () => {
    it('returns empty bookmarks message when no bookmarks', () => {
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );

      const items = (statusBar as any).buildBookmarksQuickPickItems();

      expect(items).toStrictEqual([
        { label: '$(bookmark) Bookmarks', kind: vscode.QuickPickItemKind.Separator },
        { label: '    No bookmarks yet' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: '    $(add) Add Current Selection', command: 'rangelink.bookmark.add' },
        { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
      ]);
    });

    it('returns bookmark items with count in header', () => {
      const bookmarksStoreWithItems = createMockBookmarksStore({
        bookmarks: [
          {
            id: 'bookmark-1',
            label: 'CLAUDE.md Instructions',
            link: '/Users/test/project/CLAUDE.md#L10-L20',
            description: 'Important rules',
            scope: 'global',
            createdAt: '2025-01-15T10:00:00.000Z',
            accessCount: 5,
          },
          {
            id: 'bookmark-2',
            label: 'API Error Codes',
            link: '/Users/test/project/src/errors.ts#L1-L50',
            scope: 'global',
            createdAt: '2025-01-14T10:00:00.000Z',
            accessCount: 2,
          },
        ],
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        bookmarksStoreWithItems,
        mockLogger,
      );

      const items = (statusBar as any).buildBookmarksQuickPickItems();

      expect(items).toStrictEqual([
        { label: '$(bookmark) Bookmarks (2)', kind: vscode.QuickPickItemKind.Separator },
        {
          label: '    $(file) CLAUDE.md Instructions',
          description: 'Important rules',
          command: 'rangelink.bookmark.navigate',
          bookmarkId: 'bookmark-1',
        },
        {
          label: '    $(file) API Error Codes',
          description: undefined,
          command: 'rangelink.bookmark.navigate',
          bookmarkId: 'bookmark-2',
        },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: '    $(add) Add Current Selection', command: 'rangelink.bookmark.add' },
        { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
      ]);
    });

    it('is called by buildQuickPickItems', async () => {
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockBookmarksStore,
        mockLogger,
      );
      const spy = jest.spyOn(statusBar as any, 'buildBookmarksQuickPickItems');

      await statusBar.openMenu();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
