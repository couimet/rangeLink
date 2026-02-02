import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { Bookmark } from '../bookmarks';
import type { BookmarkService } from '../bookmarks';
import { CMD_BOOKMARK_ADD, CMD_BOOKMARK_MANAGE } from '../constants';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type {
  BookmarkQuickPickItem,
  CommandQuickPickItem,
  InfoQuickPickItem,
} from '../types';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

/**
 * Union of selectable items in bookmark list.
 */
type SelectableBookmarkListItem = BookmarkQuickPickItem | CommandQuickPickItem | InfoQuickPickItem;

/**
 * Union of all bookmark list item types (selectable + VS Code separators).
 */
type BookmarkListItem =
  | SelectableBookmarkListItem
  | (vscode.QuickPickItem & { kind: vscode.QuickPickItemKind.Separator });

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

    if (!selected) {
      this.logger.debug(logCtx, 'User dismissed bookmark list');
      return;
    }

    switch ((selected as SelectableBookmarkListItem).itemKind) {
      case 'bookmark': {
        const bookmarkItem = selected as BookmarkQuickPickItem;
        await this.bookmarkService.pasteBookmark(bookmarkItem.bookmarkId);
        this.logger.debug(
          { ...logCtx, bookmarkId: bookmarkItem.bookmarkId },
          'Bookmark selected and pasted',
        );
        break;
      }

      case 'command': {
        const commandItem = selected as CommandQuickPickItem;
        await this.ideAdapter.executeCommand(commandItem.command);
        this.logger.debug(
          { ...logCtx, command: commandItem.command },
          'Command executed from menu',
        );
        break;
      }

      case 'info':
        this.logger.debug({ ...logCtx, selectedItem: selected }, 'Non-actionable info item selected');
        break;

      default:
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: 'Selected item is a separator or has unexpected itemKind',
          functionName: 'ListBookmarksCommand.execute',
          details: { selected },
        });
    }
  }

  private buildQuickPickItems(): BookmarkListItem[] {
    const bookmarks = this.bookmarkService.getAllBookmarks();

    if (bookmarks.length === 0) {
      return this.buildEmptyStateItems();
    }

    return [...this.buildBookmarkItems(bookmarks), ...this.buildFooterItems()];
  }

  private buildEmptyStateItems(): BookmarkListItem[] {
    return [
      {
        label: formatMessage(MessageCode.BOOKMARK_LIST_EMPTY),
        itemKind: 'info',
      },
      this.buildAddBookmarkItem(),
    ];
  }

  private buildBookmarkItems(bookmarks: Bookmark[]): BookmarkListItem[] {
    return bookmarks.map((bookmark) => ({
      label: `$(bookmark) ${bookmark.label}`,
      detail: bookmark.link,
      bookmarkId: bookmark.id,
      itemKind: 'bookmark',
    }));
  }

  private buildFooterItems(): BookmarkListItem[] {
    return [
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      this.buildAddBookmarkItem(),
      {
        label: formatMessage(MessageCode.BOOKMARK_ACTION_MANAGE),
        command: CMD_BOOKMARK_MANAGE,
        itemKind: 'command',
      },
    ];
  }

  private buildAddBookmarkItem(): BookmarkListItem {
    return {
      label: formatMessage(MessageCode.BOOKMARK_ACTION_ADD),
      command: CMD_BOOKMARK_ADD,
      itemKind: 'command',
    };
  }
}
