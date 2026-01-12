import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { Bookmark, BookmarkId } from '../bookmarks';
import type { BookmarkService } from '../bookmarks';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

interface ManageBookmarkItem extends vscode.QuickPickItem {
  bookmark: Bookmark;
}

const DELETE_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('trash'),
  tooltip: 'Delete bookmark',
};

/**
 * Command handler for managing bookmarks.
 *
 * Provides a QuickPick UI with delete buttons for each bookmark.
 * Deletion requires confirmation via a warning dialog.
 */
export class ManageBookmarksCommand {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly bookmarkService: BookmarkService,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'ManageBookmarksCommand.constructor' },
      'ManageBookmarksCommand initialized',
    );
  }

  async execute(): Promise<void> {
    const logCtx = { fn: 'ManageBookmarksCommand.execute' };

    const bookmarks = this.bookmarkService.getAllBookmarks();

    if (bookmarks.length === 0) {
      this.logger.debug(logCtx, 'No bookmarks to manage');
      await this.ideAdapter.showInformationMessage(
        formatMessage(MessageCode.BOOKMARK_MANAGE_EMPTY),
      );
      return;
    }

    await this.showManageQuickPick(bookmarks);
  }

  private async showManageQuickPick(bookmarks: Bookmark[]): Promise<void> {
    const logCtx = { fn: 'ManageBookmarksCommand.showManageQuickPick' };

    const quickPick = this.ideAdapter.createQuickPick<ManageBookmarkItem>();
    quickPick.title = formatMessage(MessageCode.BOOKMARK_MANAGE_TITLE);
    quickPick.placeholder = formatMessage(MessageCode.BOOKMARK_MANAGE_PLACEHOLDER);
    quickPick.items = this.buildItems(bookmarks);

    quickPick.onDidTriggerItemButton(async (event) => {
      const item = event.item;
      if (event.button === DELETE_BUTTON) {
        const deleted = await this.confirmAndDelete(item.bookmark);
        if (deleted) {
          const remainingBookmarks = this.bookmarkService.getAllBookmarks();
          if (remainingBookmarks.length === 0) {
            quickPick.hide();
          } else {
            quickPick.items = this.buildItems(remainingBookmarks);
          }
        }
      }
    });

    quickPick.onDidAccept(() => {
      this.logger.debug(logCtx, 'User selected item without action');
      quickPick.hide();
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      this.logger.debug(logCtx, 'QuickPick disposed');
    });

    quickPick.show();
  }

  private buildItems(bookmarks: Bookmark[]): ManageBookmarkItem[] {
    return bookmarks.map((bookmark) => ({
      label: `$(bookmark) ${bookmark.label}`,
      detail: bookmark.link,
      bookmark,
      buttons: [DELETE_BUTTON],
    }));
  }

  private async confirmAndDelete(bookmark: Bookmark): Promise<boolean> {
    const logCtx = { fn: 'ManageBookmarksCommand.confirmAndDelete', bookmarkId: bookmark.id };

    const confirmMessage = formatMessage(MessageCode.BOOKMARK_MANAGE_CONFIRM_DELETE, {
      label: bookmark.label,
    });
    const deleteLabel = formatMessage(MessageCode.BOOKMARK_MANAGE_CONFIRM_DELETE_YES);
    const cancelLabel = formatMessage(MessageCode.BOOKMARK_MANAGE_CONFIRM_DELETE_CANCEL);

    const choice = await this.ideAdapter.showWarningMessage(
      confirmMessage,
      deleteLabel,
      cancelLabel,
    );

    if (choice !== deleteLabel) {
      this.logger.debug(logCtx, 'Delete cancelled by user');
      return false;
    }

    return this.deleteBookmark(bookmark.id, bookmark.label);
  }

  private async deleteBookmark(bookmarkId: BookmarkId, label: string): Promise<boolean> {
    const logCtx = { fn: 'ManageBookmarksCommand.deleteBookmark', bookmarkId };

    const result = await this.bookmarkService.removeBookmark(bookmarkId);

    if (!result.success) {
      this.logger.warn({ ...logCtx, error: result.error }, 'Failed to delete bookmark');
      await this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.BOOKMARK_MANAGE_ERROR_DELETE_FAILED),
      );
      return false;
    }

    this.logger.debug(logCtx, 'Bookmark deleted successfully');
    await this.ideAdapter.showInformationMessage(
      formatMessage(MessageCode.BOOKMARK_MANAGE_DELETED, { label }),
    );
    return true;
  }
}
