import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import type { Bookmark } from '../../bookmarks';
import { ListBookmarksCommand } from '../../commands/ListBookmarksCommand';
import { createMockBookmarkService, createMockVscodeAdapter } from '../helpers';

describe('ListBookmarksCommand', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockBookmarkService: ReturnType<typeof createMockBookmarkService>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let command: ListBookmarksCommand;

  const TEST_BOOKMARK: Bookmark = {
    id: 'bookmark-1',
    label: 'Test Bookmark',
    link: 'src/utils/helper.ts#L10-L20',
    scope: 'global',
    createdAt: '2024-01-01T00:00:00.000Z',
    accessCount: 0,
  };

  const TEST_BOOKMARK_2: Bookmark = {
    id: 'bookmark-2',
    label: 'Another Bookmark',
    link: '/absolute/path/to/file.ts#L5C1-L10C15',
    scope: 'global',
    createdAt: '2024-01-02T00:00:00.000Z',
    accessCount: 5,
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockBookmarkService = createMockBookmarkService();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      mockAdapter = createMockVscodeAdapter();

      new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ListBookmarksCommand.constructor' },
        'ListBookmarksCommand initialized',
      );
    });
  });

  describe('execute()', () => {
    describe('empty state', () => {
      it('shows empty state when no bookmarks exist', async () => {
        mockBookmarkService.getAllBookmarks.mockReturnValue([]);
        mockAdapter = createMockVscodeAdapter();
        const showQuickPickSpy = jest
          .spyOn(mockAdapter, 'showQuickPick')
          .mockResolvedValue(undefined);
        command = new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(showQuickPickSpy).toHaveBeenCalledWith(
          [
            { label: 'No bookmarks saved', itemKind: 'info' },
            {
              label: '$(add) Save Selection as Bookmark',
              itemKind: 'command',
              command: 'rangelink.bookmark.add',
            },
          ],
          {
            title: 'Bookmarks',
            placeHolder: 'Select a bookmark to paste to destination',
          },
        );
      });

      it('executes add command when selecting "Save Selection as Bookmark" in empty state', async () => {
        mockBookmarkService.getAllBookmarks.mockReturnValue([]);
        const addItem = {
          label: '$(add) Save Selection as Bookmark',
          itemKind: 'command' as const,
          command: 'rangelink.bookmark.add',
        };
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showQuickPick: jest.fn().mockResolvedValue(addItem) },
        });
        jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
        command = new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(mockAdapter.executeCommand).toHaveBeenCalledWith('rangelink.bookmark.add');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ListBookmarksCommand.handleSelection', command: 'rangelink.bookmark.add' },
          'Command executed from menu',
        );
      });
    });

    describe('with bookmarks', () => {
      it('displays bookmarks with label and detail (full link)', async () => {
        mockBookmarkService.getAllBookmarks.mockReturnValue([TEST_BOOKMARK, TEST_BOOKMARK_2]);
        mockAdapter = createMockVscodeAdapter();
        const showQuickPickSpy = jest
          .spyOn(mockAdapter, 'showQuickPick')
          .mockResolvedValue(undefined);
        command = new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(showQuickPickSpy).toHaveBeenCalledWith(
          [
            {
              label: '$(bookmark) Test Bookmark',
              detail: 'src/utils/helper.ts#L10-L20',
              itemKind: 'bookmark',
              bookmarkId: 'bookmark-1',
            },
            {
              label: '$(bookmark) Another Bookmark',
              detail: '/absolute/path/to/file.ts#L5C1-L10C15',
              itemKind: 'bookmark',
              bookmarkId: 'bookmark-2',
            },
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            {
              label: '$(add) Save Selection as Bookmark',
              itemKind: 'command',
              command: 'rangelink.bookmark.add',
            },
            {
              label: '$(gear) Manage Bookmarks...',
              itemKind: 'command',
              command: 'rangelink.bookmark.manage',
            },
          ],
          {
            title: 'Bookmarks',
            placeHolder: 'Select a bookmark to paste to destination',
          },
        );
      });
    });

    describe('user dismisses menu', () => {
      it('logs dismissal and takes no action', async () => {
        mockBookmarkService.getAllBookmarks.mockReturnValue([TEST_BOOKMARK]);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showQuickPick: jest.fn().mockResolvedValue(undefined) },
        });
        command = new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ListBookmarksCommand.execute' },
          'User dismissed bookmark list',
        );
        expect(mockBookmarkService.pasteBookmark).not.toHaveBeenCalled();
      });
    });

    describe('bookmark selection', () => {
      it('delegates to BookmarkService.pasteBookmark when selecting a bookmark', async () => {
        mockBookmarkService.getAllBookmarks.mockReturnValue([TEST_BOOKMARK]);
        const selectedItem = {
          label: '$(bookmark) Test Bookmark',
          itemKind: 'bookmark' as const,
          bookmarkId: 'bookmark-1',
        };
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showQuickPick: jest.fn().mockResolvedValue(selectedItem) },
        });
        command = new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(mockBookmarkService.pasteBookmark).toHaveBeenCalledWith('bookmark-1');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ListBookmarksCommand.handleSelection', bookmarkId: 'bookmark-1' },
          'Bookmark selected and pasted',
        );
      });
    });

    describe('non-actionable item selection', () => {
      it('logs when selecting informational item with no action', async () => {
        mockBookmarkService.getAllBookmarks.mockReturnValue([]);
        const emptyStateItem = { label: 'No bookmarks saved', itemKind: 'info' as const };
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showQuickPick: jest.fn().mockResolvedValue(emptyStateItem) },
        });
        const executeCommandSpy = jest
          .spyOn(mockAdapter, 'executeCommand')
          .mockResolvedValue(undefined);
        command = new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(mockBookmarkService.pasteBookmark).not.toHaveBeenCalled();
        expect(executeCommandSpy).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ListBookmarksCommand.handleSelection', selectedItem: emptyStateItem },
          'Non-actionable item selected',
        );
      });
    });

    describe('footer actions', () => {
      it('executes add command when selecting "Save Selection as Bookmark"', async () => {
        mockBookmarkService.getAllBookmarks.mockReturnValue([TEST_BOOKMARK]);
        const addItem = {
          label: '$(add) Save Selection as Bookmark',
          itemKind: 'command' as const,
          command: 'rangelink.bookmark.add',
        };
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showQuickPick: jest.fn().mockResolvedValue(addItem) },
        });
        jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
        command = new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(mockAdapter.executeCommand).toHaveBeenCalledWith('rangelink.bookmark.add');
      });

      it('executes manage command when selecting "Manage Bookmarks..."', async () => {
        mockBookmarkService.getAllBookmarks.mockReturnValue([TEST_BOOKMARK]);
        const manageItem = {
          label: '$(gear) Manage Bookmarks...',
          itemKind: 'command' as const,
          command: 'rangelink.bookmark.manage',
        };
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { showQuickPick: jest.fn().mockResolvedValue(manageItem) },
        });
        jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
        command = new ListBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(mockAdapter.executeCommand).toHaveBeenCalledWith('rangelink.bookmark.manage');
      });
    });
  });
});
