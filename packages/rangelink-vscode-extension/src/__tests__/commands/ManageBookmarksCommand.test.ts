import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import type { Bookmark } from '../../bookmarks';
import { ManageBookmarksCommand } from '../../commands/ManageBookmarksCommand';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import { ExtensionResult } from '../../types';
import {
  createMockBookmarkService,
  createMockQuickPick,
  createMockVscodeAdapter,
} from '../helpers';

describe('ManageBookmarksCommand', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockBookmarkService: ReturnType<typeof createMockBookmarkService>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let command: ManageBookmarksCommand;

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
    mockAdapter = createMockVscodeAdapter();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ManageBookmarksCommand.constructor' },
        'ManageBookmarksCommand initialized',
      );
    });
  });

  describe('execute()', () => {
    describe('empty state', () => {
      it('shows information message when no bookmarks exist', async () => {
        const showInfoSpy = jest.spyOn(mockAdapter, 'showInformationMessage');
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(showInfoSpy).toHaveBeenCalledWith('No bookmarks to manage');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ManageBookmarksCommand.execute' },
          'No bookmarks to manage',
        );
      });
    });

    describe('with bookmarks', () => {
      it('shows QuickPick with bookmark items and delete buttons', async () => {
        mockBookmarkService = createMockBookmarkService({
          bookmarks: [TEST_BOOKMARK, TEST_BOOKMARK_2],
        });
        const mockQuickPick = createMockQuickPick();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { createQuickPick: jest.fn(() => mockQuickPick) },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();

        expect(mockQuickPick.title).toBe('Manage Bookmarks');
        expect(mockQuickPick.placeholder).toBe('Select a bookmark to manage');
        expect(mockQuickPick.items).toStrictEqual([
          {
            label: '$(bookmark) Test Bookmark',
            detail: 'src/utils/helper.ts#L10-L20',
            bookmark: TEST_BOOKMARK,
            buttons: [{ iconPath: expect.any(vscode.ThemeIcon), tooltip: 'Delete bookmark' }],
          },
          {
            label: '$(bookmark) Another Bookmark',
            detail: '/absolute/path/to/file.ts#L5C1-L10C15',
            bookmark: TEST_BOOKMARK_2,
            buttons: [{ iconPath: expect.any(vscode.ThemeIcon), tooltip: 'Delete bookmark' }],
          },
        ]);
        expect(mockQuickPick.show).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ManageBookmarksCommand.execute', bookmarkCount: 2 },
          'Showing manage QuickPick',
        );
      });

      it('disposes QuickPick on hide', async () => {
        mockBookmarkService = createMockBookmarkService({ bookmarks: [TEST_BOOKMARK] });
        const mockQuickPick = createMockQuickPick();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { createQuickPick: jest.fn(() => mockQuickPick) },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        mockQuickPick.__triggerHide();

        expect(mockQuickPick.dispose).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ManageBookmarksCommand.showManageQuickPick' },
          'QuickPick disposed',
        );
      });

      it('hides QuickPick on accept without action', async () => {
        mockBookmarkService = createMockBookmarkService({ bookmarks: [TEST_BOOKMARK] });
        const mockQuickPick = createMockQuickPick();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: { createQuickPick: jest.fn(() => mockQuickPick) },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        mockQuickPick.__triggerAccept();

        expect(mockQuickPick.hide).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ManageBookmarksCommand.showManageQuickPick' },
          'User selected item without action',
        );
      });
    });

    describe('delete flow', () => {
      it('shows confirmation dialog when delete button clicked', async () => {
        mockBookmarkService = createMockBookmarkService({ bookmarks: [TEST_BOOKMARK] });
        const mockQuickPick = createMockQuickPick();
        const mockShowWarningMessage = jest.fn().mockResolvedValue(undefined);
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            createQuickPick: jest.fn(() => mockQuickPick),
            showWarningMessage: mockShowWarningMessage,
          },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        const deleteButton = mockQuickPick.items[0].buttons![0];
        await mockQuickPick.__triggerItemButton({
          item: mockQuickPick.items[0],
          button: deleteButton,
        });

        expect(mockShowWarningMessage).toHaveBeenCalledWith(
          'Delete bookmark "Test Bookmark"?',
          'Delete',
          'Cancel',
        );
      });

      it('cancels deletion when user selects Cancel', async () => {
        mockBookmarkService = createMockBookmarkService({ bookmarks: [TEST_BOOKMARK] });
        const mockQuickPick = createMockQuickPick();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            createQuickPick: jest.fn(() => mockQuickPick),
            showWarningMessage: jest.fn().mockResolvedValue('Cancel'),
          },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        const deleteButton = mockQuickPick.items[0].buttons![0];
        await mockQuickPick.__triggerItemButton({
          item: mockQuickPick.items[0],
          button: deleteButton,
        });

        expect(mockBookmarkService.removeBookmark).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ManageBookmarksCommand.confirmAndDelete', bookmarkId: 'bookmark-1' },
          'Delete cancelled by user',
        );
      });

      it('cancels deletion when user dismisses dialog', async () => {
        mockBookmarkService = createMockBookmarkService({ bookmarks: [TEST_BOOKMARK] });
        const mockQuickPick = createMockQuickPick();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            createQuickPick: jest.fn(() => mockQuickPick),
            showWarningMessage: jest.fn().mockResolvedValue(undefined),
          },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        const deleteButton = mockQuickPick.items[0].buttons![0];
        await mockQuickPick.__triggerItemButton({
          item: mockQuickPick.items[0],
          button: deleteButton,
        });

        expect(mockBookmarkService.removeBookmark).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ManageBookmarksCommand.confirmAndDelete', bookmarkId: 'bookmark-1' },
          'Delete cancelled by user',
        );
      });

      it('deletes bookmark when user confirms', async () => {
        mockBookmarkService.getAllBookmarks
          .mockReturnValueOnce([TEST_BOOKMARK])
          .mockReturnValueOnce([]);
        const mockQuickPick = createMockQuickPick();
        const mockShowInformationMessage = jest.fn();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            createQuickPick: jest.fn(() => mockQuickPick),
            showWarningMessage: jest.fn().mockResolvedValue('Delete'),
            showInformationMessage: mockShowInformationMessage,
          },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        const deleteButton = mockQuickPick.items[0].buttons![0];
        await mockQuickPick.__triggerItemButton({
          item: mockQuickPick.items[0],
          button: deleteButton,
        });

        expect(mockBookmarkService.removeBookmark).toHaveBeenCalledWith('bookmark-1');
        expect(mockShowInformationMessage).toHaveBeenCalledWith('✓ Bookmark deleted: Test Bookmark');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ManageBookmarksCommand.confirmAndDelete', bookmarkId: 'bookmark-1' },
          'Bookmark deleted successfully',
        );
      });

      it('hides QuickPick when last bookmark deleted', async () => {
        mockBookmarkService.getAllBookmarks
          .mockReturnValueOnce([TEST_BOOKMARK])
          .mockReturnValueOnce([]);
        const mockQuickPick = createMockQuickPick();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            createQuickPick: jest.fn(() => mockQuickPick),
            showWarningMessage: jest.fn().mockResolvedValue('Delete'),
          },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        const deleteButton = mockQuickPick.items[0].buttons![0];
        await mockQuickPick.__triggerItemButton({
          item: mockQuickPick.items[0],
          button: deleteButton,
        });

        expect(mockQuickPick.hide).toHaveBeenCalled();
      });

      it('refreshes items when deleting one of multiple bookmarks', async () => {
        mockBookmarkService.getAllBookmarks
          .mockReturnValueOnce([TEST_BOOKMARK, TEST_BOOKMARK_2])
          .mockReturnValueOnce([TEST_BOOKMARK_2]);
        const mockQuickPick = createMockQuickPick();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            createQuickPick: jest.fn(() => mockQuickPick),
            showWarningMessage: jest.fn().mockResolvedValue('Delete'),
          },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        const deleteButton = mockQuickPick.items[0].buttons![0];
        await mockQuickPick.__triggerItemButton({
          item: mockQuickPick.items[0],
          button: deleteButton,
        });

        expect(mockQuickPick.hide).not.toHaveBeenCalled();
        expect(mockQuickPick.items).toHaveLength(1);
        expect(mockQuickPick.items[0].bookmark).toStrictEqual(TEST_BOOKMARK_2);
      });

      it('shows error message when deletion fails', async () => {
        mockBookmarkService = createMockBookmarkService({ bookmarks: [TEST_BOOKMARK] });
        const storageError = new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.BOOKMARK_SAVE_FAILED,
          message: 'Storage error',
          functionName: 'BookmarksStore.remove',
        });
        mockBookmarkService.removeBookmark.mockResolvedValue(ExtensionResult.err(storageError));
        const mockQuickPick = createMockQuickPick();
        const mockShowErrorMessage = jest.fn();
        mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            createQuickPick: jest.fn(() => mockQuickPick),
            showWarningMessage: jest.fn().mockResolvedValue('Delete'),
            showErrorMessage: mockShowErrorMessage,
          },
        });
        command = new ManageBookmarksCommand(mockAdapter, mockBookmarkService, mockLogger);

        await command.execute();
        const deleteButton = mockQuickPick.items[0].buttons![0];
        await mockQuickPick.__triggerItemButton({
          item: mockQuickPick.items[0],
          button: deleteButton,
        });

        expect(mockShowErrorMessage).toHaveBeenCalledWith('RangeLink: Failed to delete bookmark');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            fn: 'ManageBookmarksCommand.confirmAndDelete',
            bookmarkId: 'bookmark-1',
          }),
          'Failed to delete bookmark',
        );
      });
    });
  });
});
