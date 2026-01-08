import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { Bookmark, BookmarkId } from '../bookmarks';
import type { BookmarkService } from '../bookmarks';
import { CMD_BOOKMARK_ADD, CMD_BOOKMARK_MANAGE } from '../constants';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

interface BookmarkQuickPickItem extends vscode.QuickPickItem {
  bookmarkId?: BookmarkId;
  command?: string;
}

export class ListBookmarksCommand {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly bookmarkService: BookmarkService,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'ListBookmarksCommand.constructor' },
      'ListBookmarksCommand initialized',
    );
  }

  async execute(): Promise<void> {
    const logCtx = { fn: 'ListBookmarksCommand.execute' };

    const items = this.buildQuickPickItems();

    const selected = await this.ideAdapter.showQuickPick(items, {
      title: formatMessage(MessageCode.BOOKMARK_LIST_TITLE),
      placeHolder: formatMessage(MessageCode.BOOKMARK_LIST_PLACEHOLDER),
    });

    if (!selected) {
      this.logger.debug(logCtx, 'User dismissed bookmark list');
      return;
    }

    if (selected.bookmarkId) {
      await this.bookmarkService.pasteBookmark(selected.bookmarkId);
      this.logger.debug(
        { ...logCtx, bookmarkId: selected.bookmarkId },
        'Bookmark selected and pasted',
      );
    } else if (selected.command) {
      await this.ideAdapter.executeCommand(selected.command);
      this.logger.debug({ ...logCtx, command: selected.command }, 'Command executed from menu');
    } else {
      this.logger.debug({ ...logCtx, selectedItem: selected }, 'Non-actionable item selected');
    }
  }

  private buildQuickPickItems(): BookmarkQuickPickItem[] {
    const bookmarks = this.bookmarkService.getAllBookmarks();

    if (bookmarks.length === 0) {
      return this.buildEmptyStateItems();
    }

    return [...this.buildBookmarkItems(bookmarks), ...this.buildFooterItems()];
  }

  private buildEmptyStateItems(): BookmarkQuickPickItem[] {
    return [
      {
        label: formatMessage(MessageCode.BOOKMARK_LIST_EMPTY),
      },
      this.buildAddBookmarkItem(),
    ];
  }

  private buildBookmarkItems(bookmarks: Bookmark[]): BookmarkQuickPickItem[] {
    return bookmarks.map((bookmark) => ({
      label: `$(bookmark) ${bookmark.label}`,
      detail: bookmark.link,
      bookmarkId: bookmark.id,
    }));
  }

  private buildFooterItems(): BookmarkQuickPickItem[] {
    return [
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      this.buildAddBookmarkItem(),
      {
        label: formatMessage(MessageCode.BOOKMARK_ACTION_MANAGE),
        command: CMD_BOOKMARK_MANAGE,
      },
    ];
  }

  private buildAddBookmarkItem(): BookmarkQuickPickItem {
    return {
      label: formatMessage(MessageCode.BOOKMARK_ACTION_ADD),
      command: CMD_BOOKMARK_ADD,
    };
  }
}
