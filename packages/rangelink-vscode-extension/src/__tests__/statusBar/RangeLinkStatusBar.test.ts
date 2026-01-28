import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import type { Bookmark } from '../../bookmarks';
import type { DestinationAvailabilityService } from '../../destinations/DestinationAvailabilityService';
import { RangeLinkStatusBar } from '../../statusBar/RangeLinkStatusBar';
import {
  createMockBookmarkService,
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
  const MOCK_BOOKMARKS: Bookmark[] = [
    {
      id: 'bookmark-1',
      label: 'CLAUDE.md Instructions',
      link: '/Users/test/project/CLAUDE.md#L10-L20',
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
  ];

  let createStatusBarItemMock: jest.Mock;
  let showQuickPickMock: jest.Mock;
  let executeCommandMock: jest.Mock;
  let mockStatusBarItem: ReturnType<typeof createMockStatusBarItem>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockAvailabilityService: jest.Mocked<DestinationAvailabilityService>;
  let mockBookmarkService: ReturnType<typeof createMockBookmarkService>;

  beforeEach(() => {
    mockStatusBarItem = createMockStatusBarItem();
    mockLogger = createMockLogger();
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
    mockBookmarkService = createMockBookmarkService();
  });

  describe('constructor', () => {
    it('creates and configures status bar item', () => {
      new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
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
      const mockTerminal = { name: 'bash' } as vscode.Terminal;
      mockAvailabilityService.getAvailableDestinationItems.mockResolvedValue([
        { kind: 'terminal', terminal: mockTerminal, displayName: 'bash', isActive: true },
        { kind: 'destination', destinationType: 'claude-code', displayName: 'Claude Code Chat' },
      ]);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledTimes(1);
      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'No bound destination. Choose below to bind:' },
          {
            label: '    $(arrow-right) Terminal "bash"',
            description: 'active',
            terminal: mockTerminal,
            itemKind: 'terminal',
          },
          { label: '    $(arrow-right) Claude Code Chat', destinationType: 'claude-code', itemKind: 'destination' },
          { label: '$(link-external) Go to Link', command: 'rangelink.goToRangeLink' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: 'Bookmarks' },
          { label: '    No bookmarks saved' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '    $(add) Save Selection as Bookmark', command: 'rangelink.bookmark.add' },
          { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(info) Show Version Info', command: 'rangelink.showVersion' },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });

    it('shows "no destinations available" when unbound and no destinations exist', async () => {
      mockAvailabilityService.getAvailableDestinationItems.mockResolvedValue([]);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'No destinations available' },
          { label: '$(link-external) Go to Link', command: 'rangelink.goToRangeLink' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: 'Bookmarks' },
          { label: '    No bookmarks saved' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '    $(add) Save Selection as Bookmark', command: 'rangelink.bookmark.add' },
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
        mockBookmarkService,
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
          { label: '$(link-external) Go to Link', command: 'rangelink.goToRangeLink' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: 'Bookmarks' },
          { label: '    No bookmarks saved' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '    $(add) Save Selection as Bookmark', command: 'rangelink.bookmark.add' },
          { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(info) Show Version Info', command: 'rangelink.showVersion' },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });

    it('shows bookmark items when bookmarks exist', async () => {
      const mockTerminal = { name: 'bash' } as vscode.Terminal;
      mockAvailabilityService.getAvailableDestinationItems.mockResolvedValue([
        { kind: 'terminal', terminal: mockTerminal, displayName: 'bash', isActive: true },
      ]);
      mockBookmarkService.getAllBookmarks.mockReturnValue(MOCK_BOOKMARKS);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'No bound destination. Choose below to bind:' },
          {
            label: '    $(arrow-right) Terminal "bash"',
            description: 'active',
            terminal: mockTerminal,
            itemKind: 'terminal',
          },
          { label: '$(link-external) Go to Link', command: 'rangelink.goToRangeLink' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: 'Bookmarks' },
          {
            label: '    $(bookmark) CLAUDE.md Instructions',
            command: 'rangelink.bookmark.navigate',
            bookmarkId: 'bookmark-1',
          },
          {
            label: '    $(bookmark) API Error Codes',
            command: 'rangelink.bookmark.navigate',
            bookmarkId: 'bookmark-2',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '    $(add) Save Selection as Bookmark', command: 'rangelink.bookmark.add' },
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
        mockBookmarkService,
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
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(mockDestinationManager.bindAndJump).toHaveBeenCalledWith({ type: 'terminal' });
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
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(mockDestinationManager.bindAndJump).toHaveBeenCalledWith({ type: 'terminal' });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: { label: '    $(arrow-right) Terminal', destinationType: 'terminal' },
          bindAndJumpSuccess: false,
        },
        'Destination item selected',
      );
    });

    it('logs when non-actionable item without command is selected', async () => {
      const nonActionableItem = { label: 'Synthetic Disabled Item' };
      showQuickPickMock.mockResolvedValue(nonActionableItem);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(executeCommandMock).not.toHaveBeenCalled();
      expect(mockDestinationManager.bindAndJump).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: nonActionableItem },
        'Non-actionable item selected',
      );
    });

    it('logs dismissal and takes no action when user dismisses QuickPick', async () => {
      showQuickPickMock.mockResolvedValue(QUICK_PICK_DISMISSED);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(executeCommandMock).not.toHaveBeenCalled();
      expect(mockDestinationManager.bindAndJump).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.openMenu' },
        'User dismissed menu',
      );
    });
  });

  describe('openMenu - bookmark selection', () => {
    it('delegates to BookmarkService.pasteBookmark when bookmark item is selected', async () => {
      showQuickPickMock.mockResolvedValue({
        label: '    $(bookmark) Test Bookmark',
        command: 'rangelink.bookmark.navigate',
        bookmarkId: 'bookmark-1',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(executeCommandMock).not.toHaveBeenCalled();
      expect(mockDestinationManager.bindAndJump).not.toHaveBeenCalled();
      expect(mockBookmarkService.pasteBookmark).toHaveBeenCalledWith('bookmark-1');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: {
            label: '    $(bookmark) Test Bookmark',
            command: 'rangelink.bookmark.navigate',
            bookmarkId: 'bookmark-1',
          },
        },
        'Menu item selected',
      );
    });
  });

  describe('dispose', () => {
    it('disposes status bar item and logs', () => {
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
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
        mockBookmarkService,
        mockLogger,
      );

      const items = (
        statusBar as unknown as { buildBookmarksQuickPickItems: () => unknown[] }
      ).buildBookmarksQuickPickItems();

      expect(items).toStrictEqual([
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: 'Bookmarks' },
        { label: '    No bookmarks saved' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: '    $(add) Save Selection as Bookmark', command: 'rangelink.bookmark.add' },
        { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
      ]);
    });

    it('returns bookmark items when bookmarks exist', () => {
      mockBookmarkService.getAllBookmarks.mockReturnValue(MOCK_BOOKMARKS);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      const items = (
        statusBar as unknown as { buildBookmarksQuickPickItems: () => unknown[] }
      ).buildBookmarksQuickPickItems();

      expect(items).toStrictEqual([
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: 'Bookmarks' },
        {
          label: '    $(bookmark) CLAUDE.md Instructions',
          command: 'rangelink.bookmark.navigate',
          bookmarkId: 'bookmark-1',
        },
        {
          label: '    $(bookmark) API Error Codes',
          command: 'rangelink.bookmark.navigate',
          bookmarkId: 'bookmark-2',
        },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        { label: '    $(add) Save Selection as Bookmark', command: 'rangelink.bookmark.add' },
        { label: '    $(gear) Manage Bookmarks...', command: 'rangelink.bookmark.manage' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
      ]);
    });

    it('is called by buildQuickPickItems', async () => {
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
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
