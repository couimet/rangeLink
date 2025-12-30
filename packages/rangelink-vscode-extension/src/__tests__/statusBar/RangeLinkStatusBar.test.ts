import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import type { Bookmark } from '../../bookmarks';
import type { ConfigReader } from '../../config/ConfigReader';
import type { DestinationAvailabilityService } from '../../destinations/DestinationAvailabilityService';
import { RangeLinkStatusBar } from '../../statusBar/RangeLinkStatusBar';
import {
  createMockBookmarksStore,
  createMockClipboard,
  createMockConfigReader,
  createMockDestinationAvailabilityService,
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
  let mockAvailabilityService: jest.Mocked<DestinationAvailabilityService>;
  let mockConfigReader: jest.Mocked<ConfigReader>;
  let mockBookmarksStore: ReturnType<typeof createMockBookmarksStore>;

  beforeEach(() => {
    mockStatusBarItem = createMockStatusBarItem();
    mockLogger = createMockLogger();
    mockConfigReader = createMockConfigReader();
    mockAvailabilityService = createMockDestinationAvailabilityService();
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
      new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
        mockLogger,
      );

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
    it('shows inline destinations when no destination is bound', async () => {
      mockAvailabilityService.getAvailableDestinations.mockResolvedValue([
        { type: 'terminal', displayName: 'Terminal' },
        { type: 'claude-code', displayName: 'Claude Code Chat' },
      ]);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledTimes(1);
      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'No bound destination. Choose below to bind:' },
          { label: '    $(arrow-right) Terminal', destinationType: 'terminal' },
          { label: '    $(arrow-right) Claude Code Chat', destinationType: 'claude-code' },
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

    it('shows "no destinations available" when unbound and no destinations exist', async () => {
      mockAvailabilityService.getAvailableDestinations.mockResolvedValue([]);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'No destinations available' },
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
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
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
      mockAvailabilityService.getAvailableDestinations.mockResolvedValue([
        { type: 'terminal', displayName: 'Terminal' },
      ]);
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
        mockAvailabilityService,
        bookmarksStoreWithItems,
        mockConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'No bound destination. Choose below to bind:' },
          { label: '    $(arrow-right) Terminal', destinationType: 'terminal' },
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
   * Uses synthetic items (not real menu items) to test the selection logic
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
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
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

    it('binds and jumps when item with destinationType is selected', async () => {
      mockDestinationManager.bindAndJump.mockResolvedValue(true);
      showQuickPickMock.mockResolvedValue({
        label: '    $(arrow-right) Terminal',
        destinationType: 'terminal',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(mockDestinationManager.bindAndJump).toHaveBeenCalledWith('terminal');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: { label: '    $(arrow-right) Terminal', destinationType: 'terminal' },
          bindAndJumpSuccess: true,
        },
        'Destination item selected',
      );
    });

    it('logs failure when bindAndJump fails', async () => {
      mockDestinationManager.bindAndJump.mockResolvedValue(false);
      showQuickPickMock.mockResolvedValue({
        label: '    $(arrow-right) Terminal',
        destinationType: 'terminal',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(mockDestinationManager.bindAndJump).toHaveBeenCalledWith('terminal');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: { label: '    $(arrow-right) Terminal', destinationType: 'terminal' },
          bindAndJumpSuccess: false,
        },
        'Destination item selected',
      );
    });

    it('does not execute command or log when item without command is selected', async () => {
      showQuickPickMock.mockResolvedValue({
        label: 'Synthetic Disabled Item',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
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
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
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
        mockAvailabilityService,
        bookmarksStoreWithItem,
        mockConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(bookmarksStoreWithItem.recordAccess).toHaveBeenCalledWith('bookmark-1');
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('/Users/test/project/file.ts#L10-L20');
      expect(boundDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
        '/Users/test/project/file.ts#L10-L20',
        'Bookmark pasted: Test Bookmark',
        'both',
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
        mockAvailabilityService,
        bookmarksStoreWithItem,
        mockConfigReader,
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
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.pasteBookmarkToDestination', bookmarkId: 'non-existent-id' },
        'Bookmark not found',
      );
      expect(mockBookmarksStore.recordAccess).not.toHaveBeenCalled();
    });

    it('does not read paddingMode when menu is dismissed without selection', async () => {
      const customConfigReader = createMockConfigReader();
      showQuickPickMock.mockResolvedValue(QUICK_PICK_DISMISSED);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarksStore,
        customConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(customConfigReader.getPaddingMode).not.toHaveBeenCalled();
    });

    it('reads paddingMode at paste time with correct setting key and default', async () => {
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
      const adapterWithClipboard = createMockVscodeAdapter({
        windowOptions: {
          createStatusBarItem: createStatusBarItemMock,
          showQuickPick: showQuickPickMock,
        },
        commandsOptions: {
          executeCommand: executeCommandMock,
        },
      });
      const customConfigReader = createMockConfigReader();

      showQuickPickMock.mockResolvedValue({
        label: '    $(file) Test Bookmark',
        command: 'rangelink.bookmark.navigate',
        bookmarkId: 'bookmark-1',
      });
      const statusBar = new RangeLinkStatusBar(
        adapterWithClipboard,
        boundDestinationManager,
        mockAvailabilityService,
        bookmarksStoreWithItem,
        customConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(customConfigReader.getPaddingMode).toHaveBeenCalledWith(
        'smartPadding.pasteBookmark',
        'both',
      );
    });

    it('forwards custom paddingMode from configReader to sendTextToDestination', async () => {
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
      const adapterWithClipboard = createMockVscodeAdapter({
        windowOptions: {
          createStatusBarItem: createStatusBarItemMock,
          showQuickPick: showQuickPickMock,
        },
        commandsOptions: {
          executeCommand: executeCommandMock,
        },
      });
      const customConfigReader = createMockConfigReader({
        getPaddingMode: jest.fn().mockReturnValue('none'),
      });

      showQuickPickMock.mockResolvedValue({
        label: '    $(file) Test Bookmark',
        command: 'rangelink.bookmark.navigate',
        bookmarkId: 'bookmark-1',
      });
      const statusBar = new RangeLinkStatusBar(
        adapterWithClipboard,
        boundDestinationManager,
        mockAvailabilityService,
        bookmarksStoreWithItem,
        customConfigReader,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(boundDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
        '/Users/test/project/file.ts#L10-L20',
        'Bookmark pasted: Test Bookmark',
        'none',
      );
    });
  });

  describe('dispose', () => {
    it('disposes status bar item and logs', () => {
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
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
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
        mockLogger,
      );

      const items = (
        statusBar as unknown as { buildBookmarksQuickPickItems: () => unknown[] }
      ).buildBookmarksQuickPickItems();

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
        mockAvailabilityService,
        bookmarksStoreWithItems,
        mockConfigReader,
        mockLogger,
      );

      const items = (
        statusBar as unknown as { buildBookmarksQuickPickItems: () => unknown[] }
      ).buildBookmarksQuickPickItems();

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
        mockAvailabilityService,
        mockBookmarksStore,
        mockConfigReader,
        mockLogger,
      );
      const spy = jest.spyOn(
        statusBar as unknown as { buildBookmarksQuickPickItems: () => unknown[] },
        'buildBookmarksQuickPickItems',
      );

      await statusBar.openMenu();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
