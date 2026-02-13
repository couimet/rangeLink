import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import type { Bookmark } from '../../bookmarks';
import type { TerminalPickerHandlers } from '../../destinations/types';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import { RangeLinkStatusBar } from '../../statusBar/RangeLinkStatusBar';
import type { EligibleTerminal, TerminalBindableQuickPickItem } from '../../types';
import { ExtensionResult } from '../../types';
import {
  createMockBookmarkService,
  createMockDestinationAvailabilityService,
  createMockDestinationManager,
  createMockStatusBarItem,
  createMockTerminal,
  createMockTerminalPasteDestination,
  createMockTerminalQuickPickItem,
  createMockVscodeAdapter,
  spyOnShowTerminalPicker,
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
  let mockAvailabilityService: ReturnType<typeof createMockDestinationAvailabilityService>;
  let mockBookmarkService: ReturnType<typeof createMockBookmarkService>;
  let showTerminalPickerSpy: jest.SpyInstance;

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
    showTerminalPickerSpy = spyOnShowTerminalPicker();
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
      const mockTerminal = createMockTerminal();
      mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({
        terminal: [
          {
            label: 'Terminal',
            displayName: 'Terminal',
            itemKind: 'bindable',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            terminalInfo: { terminal: mockTerminal, name: mockTerminal.name, isActive: false },
          },
        ],
        'claude-code': [
          {
            label: 'Claude Code Chat',
            displayName: 'Claude Code Chat',
            itemKind: 'bindable',
            bindOptions: { kind: 'claude-code' },
          },
        ],
      });
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
          { label: 'No bound destination. Choose below to bind:', itemKind: 'info' },
          { label: 'AI Assistants', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '    $(arrow-right) Claude Code Chat',
            displayName: 'Claude Code Chat',
            itemKind: 'bindable',
            bindOptions: { kind: 'claude-code' },
            description: undefined,
          },
          { label: 'Terminals', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '    $(arrow-right) Terminal',
            displayName: 'Terminal',
            itemKind: 'bindable',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            description: undefined,
            terminalInfo: { terminal: mockTerminal, name: mockTerminal.name, isActive: false },
          },
          {
            label: '$(link-external) Go to Link',
            itemKind: 'command',
            command: 'rangelink.goToRangeLink',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: 'Bookmarks', itemKind: 'info' },
          { label: '    No bookmarks saved', itemKind: 'info' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '    $(add) Save Selection as Bookmark',
            itemKind: 'command',
            command: 'rangelink.bookmark.add',
          },
          {
            label: '    $(gear) Manage Bookmarks...',
            itemKind: 'command',
            command: 'rangelink.bookmark.manage',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '$(info) Show Version Info',
            itemKind: 'command',
            command: 'rangelink.showVersion',
          },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });

    it('shows "no destinations available" when unbound and no destinations exist', async () => {
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
          { label: 'No destinations available', itemKind: 'info' },
          {
            label: '$(link-external) Go to Link',
            itemKind: 'command',
            command: 'rangelink.goToRangeLink',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: 'Bookmarks', itemKind: 'info' },
          { label: '    No bookmarks saved', itemKind: 'info' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '    $(add) Save Selection as Bookmark',
            itemKind: 'command',
            command: 'rangelink.bookmark.add',
          },
          {
            label: '    $(gear) Manage Bookmarks...',
            itemKind: 'command',
            command: 'rangelink.bookmark.manage',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '$(info) Show Version Info',
            itemKind: 'command',
            command: 'rangelink.showVersion',
          },
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
            itemKind: 'command',
            command: 'rangelink.jumpToBoundDestination',
          },
          {
            label: '$(link-external) Go to Link',
            itemKind: 'command',
            command: 'rangelink.goToRangeLink',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: 'Bookmarks', itemKind: 'info' },
          { label: '    No bookmarks saved', itemKind: 'info' },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '    $(add) Save Selection as Bookmark',
            itemKind: 'command',
            command: 'rangelink.bookmark.add',
          },
          {
            label: '    $(gear) Manage Bookmarks...',
            itemKind: 'command',
            command: 'rangelink.bookmark.manage',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '$(info) Show Version Info',
            itemKind: 'command',
            command: 'rangelink.showVersion',
          },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });

    it('shows bookmark items when bookmarks exist', async () => {
      const mockTerminal = createMockTerminal();
      mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({
        terminal: [
          {
            label: 'Terminal',
            displayName: 'Terminal',
            itemKind: 'bindable',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            terminalInfo: { terminal: mockTerminal, name: mockTerminal.name, isActive: false },
          },
        ],
      });
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
          { label: 'No bound destination. Choose below to bind:', itemKind: 'info' },
          { label: 'Terminals', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '    $(arrow-right) Terminal',
            displayName: 'Terminal',
            itemKind: 'bindable',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            description: undefined,
            terminalInfo: { terminal: mockTerminal, name: mockTerminal.name, isActive: false },
          },
          {
            label: '$(link-external) Go to Link',
            itemKind: 'command',
            command: 'rangelink.goToRangeLink',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: 'Bookmarks', itemKind: 'info' },
          {
            label: '    $(bookmark) CLAUDE.md Instructions',
            itemKind: 'bookmark',
            bookmarkId: 'bookmark-1',
          },
          {
            label: '    $(bookmark) API Error Codes',
            itemKind: 'bookmark',
            bookmarkId: 'bookmark-2',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '    $(add) Save Selection as Bookmark',
            itemKind: 'command',
            command: 'rangelink.bookmark.add',
          },
          {
            label: '    $(gear) Manage Bookmarks...',
            itemKind: 'command',
            command: 'rangelink.bookmark.manage',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          {
            label: '$(info) Show Version Info',
            itemKind: 'command',
            command: 'rangelink.showVersion',
          },
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
    it('executes command and logs when command item is selected', async () => {
      showQuickPickMock.mockResolvedValue({
        label: 'Synthetic Item',
        itemKind: 'command',
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
          selectedItem: {
            label: 'Synthetic Item',
            itemKind: 'command',
            command: 'synthetic.testCommand',
          },
        },
        'Command item selected',
      );
    });

    it('binds and focuses when bindable item is selected', async () => {
      const mockTerminal = createMockTerminal();
      const bindOptions = { kind: 'terminal' as const, terminal: mockTerminal };
      mockDestinationManager.bindAndFocus.mockResolvedValue(
        ExtensionResult.ok({ destinationName: 'Terminal', destinationKind: 'terminal' }),
      );
      showQuickPickMock.mockResolvedValue({
        label: '    $(arrow-right) Terminal',
        itemKind: 'bindable',
        bindOptions,
        displayName: 'Terminal',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(mockDestinationManager.bindAndFocus).toHaveBeenCalledWith(bindOptions);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: {
            label: '    $(arrow-right) Terminal',
            itemKind: 'bindable',
            bindOptions,
            displayName: 'Terminal',
          },
          bindAndFocusSuccess: true,
        },
        'Destination item selected',
      );
    });

    it('logs failure when bindAndFocus fails', async () => {
      const mockTerminal = createMockTerminal();
      const bindOptions = { kind: 'terminal' as const, terminal: mockTerminal };
      const bindError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
        message: 'bind failed',
        functionName: 'PasteDestinationManager.bindAndFocus',
      });
      mockDestinationManager.bindAndFocus.mockResolvedValue(ExtensionResult.err(bindError));
      showQuickPickMock.mockResolvedValue({
        label: '    $(arrow-right) Terminal',
        itemKind: 'bindable',
        bindOptions,
        displayName: 'Terminal',
      });
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(mockDestinationManager.bindAndFocus).toHaveBeenCalledWith(bindOptions);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: {
            label: '    $(arrow-right) Terminal',
            itemKind: 'bindable',
            bindOptions,
            displayName: 'Terminal',
          },
          bindAndFocusSuccess: false,
        },
        'Destination item selected',
      );
    });

    it('logs when info item is selected', async () => {
      const infoItem = { label: 'Synthetic Info Item', itemKind: 'info' as const };
      showQuickPickMock.mockResolvedValue(infoItem);
      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(executeCommandMock).not.toHaveBeenCalled();
      expect(mockDestinationManager.bindAndFocus).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: infoItem },
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
      expect(mockDestinationManager.bindAndFocus).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.openMenu' },
        'User dismissed menu',
      );
    });
  });

  describe('openMenu - terminal-more selection', () => {
    const terminalMoreItem = {
      label: 'More terminals...',
      displayName: 'More terminals...',
      itemKind: 'terminal-more' as const,
      remainingCount: 3,
    };

    it('shows secondary terminal picker and binds when terminal is selected', async () => {
      const mockTerminal = createMockTerminal({ name: 'bash' });
      const eligibleTerminal: EligibleTerminal = {
        terminal: mockTerminal,
        name: 'bash',
        isActive: false,
      };

      mockAvailabilityService.getTerminalItems.mockResolvedValue([
        createMockTerminalQuickPickItem(mockTerminal),
      ]);
      mockDestinationManager.bindAndFocus.mockResolvedValue(
        ExtensionResult.ok({ destinationName: 'bash', destinationKind: 'terminal' }),
      );

      showQuickPickMock.mockResolvedValueOnce(terminalMoreItem);

      showTerminalPickerSpy.mockImplementation(
        async (
          _terminals: readonly TerminalBindableQuickPickItem[],
          _provider: unknown,
          handlers: TerminalPickerHandlers<void>,
          _logger: unknown,
        ): Promise<void | undefined> => {
          await handlers.onSelected(eligibleTerminal);
        },
      );

      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showTerminalPickerSpy).toHaveBeenCalled();
      expect(mockDestinationManager.bindAndFocus).toHaveBeenCalledWith({
        kind: 'terminal',
        terminal: mockTerminal,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: terminalMoreItem,
          bindAndFocusSuccess: true,
        },
        'Terminal selected from overflow picker',
      );
    });

    it('re-opens status bar menu when user cancels secondary terminal picker', async () => {
      mockAvailabilityService.getTerminalItems.mockResolvedValue([
        createMockTerminalQuickPickItem(createMockTerminal()),
      ]);

      showQuickPickMock
        .mockResolvedValueOnce(terminalMoreItem)
        .mockResolvedValueOnce(QUICK_PICK_DISMISSED);

      showTerminalPickerSpy.mockImplementation(
        async (
          _terminals: readonly TerminalBindableQuickPickItem[],
          _provider: unknown,
          handlers: TerminalPickerHandlers<void>,
          _logger: unknown,
        ): Promise<void | undefined> => {
          await handlers.onDismissed?.();
        },
      );

      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showTerminalPickerSpy).toHaveBeenCalled();
      expect(showQuickPickMock).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: terminalMoreItem },
        'User returned from terminal picker, re-opening menu',
      );
    });

    it('re-opens status bar menu when user returns from secondary picker', async () => {
      mockAvailabilityService.getTerminalItems.mockResolvedValue([
        createMockTerminalQuickPickItem(createMockTerminal()),
      ]);

      showQuickPickMock
        .mockResolvedValueOnce(terminalMoreItem)
        .mockResolvedValueOnce(QUICK_PICK_DISMISSED);

      showTerminalPickerSpy.mockImplementation(
        async (
          _terminals: readonly TerminalBindableQuickPickItem[],
          _provider: unknown,
          handlers: TerminalPickerHandlers<void>,
          _logger: unknown,
        ): Promise<void | undefined> => {
          await handlers.onDismissed?.();
        },
      );

      const statusBar = new RangeLinkStatusBar(
        mockAdapter,
        mockDestinationManager,
        mockAvailabilityService,
        mockBookmarkService,
        mockLogger,
      );

      await statusBar.openMenu();

      expect(showTerminalPickerSpy).toHaveBeenCalled();
      expect(showQuickPickMock).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: terminalMoreItem },
        'User returned from terminal picker, re-opening menu',
      );
    });
  });

  describe('openMenu - bookmark selection', () => {
    it('delegates to BookmarkService.pasteBookmark when bookmark item is selected', async () => {
      showQuickPickMock.mockResolvedValue({
        label: '    $(bookmark) Test Bookmark',
        itemKind: 'bookmark',
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
      expect(mockDestinationManager.bindAndFocus).not.toHaveBeenCalled();
      expect(mockBookmarkService.pasteBookmark).toHaveBeenCalledWith('bookmark-1');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: {
            label: '    $(bookmark) Test Bookmark',
            itemKind: 'bookmark',
            bookmarkId: 'bookmark-1',
          },
        },
        'Bookmark item selected',
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
        { label: 'Bookmarks', itemKind: 'info' },
        { label: '    No bookmarks saved', itemKind: 'info' },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        {
          label: '    $(add) Save Selection as Bookmark',
          itemKind: 'command',
          command: 'rangelink.bookmark.add',
        },
        {
          label: '    $(gear) Manage Bookmarks...',
          itemKind: 'command',
          command: 'rangelink.bookmark.manage',
        },
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
        { label: 'Bookmarks', itemKind: 'info' },
        {
          label: '    $(bookmark) CLAUDE.md Instructions',
          itemKind: 'bookmark',
          bookmarkId: 'bookmark-1',
        },
        {
          label: '    $(bookmark) API Error Codes',
          itemKind: 'bookmark',
          bookmarkId: 'bookmark-2',
        },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        {
          label: '    $(add) Save Selection as Bookmark',
          itemKind: 'command',
          command: 'rangelink.bookmark.add',
        },
        {
          label: '    $(gear) Manage Bookmarks...',
          itemKind: 'command',
          command: 'rangelink.bookmark.manage',
        },
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
