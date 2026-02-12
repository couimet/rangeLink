import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { Bookmark } from '../bookmarks';
import type { BookmarkService } from '../bookmarks';
import { CMD_BOOKMARK_ADD, CMD_BOOKMARK_MANAGE } from '../constants';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { BookmarkQuickPickItem, CommandQuickPickItem, InfoQuickPickItem } from '../types';
import { MessageCode } from '../types';
import { formatMessage, isSelectableQuickPickItem } from '../utils';

type ListBookmarksQuickPickItem = BookmarkQuickPickItem | CommandQuickPickItem | InfoQuickPickItem;

/**
 * Command handler for displaying bookmarks.
 *
 * Allows users to select a bookmark to paste its link to the bound destination,
 * or access bookmark management actions. Updates bookmark access metadata
 * (lastAccessedAt, accessCount) on selection.
 */
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

    if (!isSelectableQuickPickItem<ListBookmarksQuickPickItem>(selected)) {
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

  private buildQuickPickItems(): (ListBookmarksQuickPickItem | vscode.QuickPickItem)[] {
    const bookmarks = this.bookmarkService.getAllBookmarks();

    if (bookmarks.length === 0) {
      return this.buildEmptyStateItems();
    }

    return [...this.buildBookmarkItems(bookmarks), ...this.buildFooterItems()];
  }

  private buildEmptyStateItems(): (InfoQuickPickItem | CommandQuickPickItem)[] {
    return [
      {
        label: formatMessage(MessageCode.BOOKMARK_LIST_EMPTY),
        itemKind: 'info' as const,
      },
      this.buildAddBookmarkItem(),
    ];
  }

  private buildBookmarkItems(bookmarks: Bookmark[]): BookmarkQuickPickItem[] {
    return bookmarks.map((bookmark) => ({
      label: `$(bookmark) ${bookmark.label}`,
      detail: bookmark.link,
      itemKind: 'bookmark' as const,
      bookmarkId: bookmark.id,
    }));
  }

  private buildFooterItems(): (CommandQuickPickItem | vscode.QuickPickItem)[] {
    return [
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      this.buildAddBookmarkItem(),
      {
        label: formatMessage(MessageCode.BOOKMARK_ACTION_MANAGE),
        itemKind: 'command' as const,
        command: CMD_BOOKMARK_MANAGE,
      },
    ];
  }

  private buildAddBookmarkItem(): CommandQuickPickItem {
    return {
      label: formatMessage(MessageCode.BOOKMARK_ACTION_ADD),
      itemKind: 'command' as const,
      command: CMD_BOOKMARK_ADD,
    };
  }
}
