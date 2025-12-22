import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { BookmarkId, BookmarksStore } from '../bookmarks';
import {
  CMD_BOOKMARK_ADD,
  CMD_BOOKMARK_MANAGE,
  CMD_BOOKMARK_NAVIGATE,
  CMD_JUMP_TO_DESTINATION,
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_SHOW_VERSION,
} from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

/**
 * QuickPick item with optional command to execute on selection.
 */
interface MenuQuickPickItem extends vscode.QuickPickItem {
  command?: string;
  bookmarkId?: BookmarkId;
}

/**
 * Status bar priority - higher values appear more to the left.
 * 100 is a reasonable default that places RangeLink near other extension items.
 */
const STATUS_BAR_PRIORITY = 100;

/**
 * Manages RangeLink status bar item and menu.
 *
 * Creates a status bar item that opens a QuickPick menu when clicked.
 * Menu items are context-aware (e.g., Jump disabled when no destination bound).
 */
export class RangeLinkStatusBar implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly bookmarksStore: BookmarksStore,
    private readonly logger: Logger,
  ) {
    this.statusBarItem = this.ideAdapter.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      STATUS_BAR_PRIORITY,
    );

    this.statusBarItem.text = formatMessage(MessageCode.STATUS_BAR_ITEM_TEXT);
    this.statusBarItem.tooltip = formatMessage(MessageCode.STATUS_BAR_MENU_TOOLTIP);
    this.statusBarItem.command = CMD_OPEN_STATUS_BAR_MENU;
    this.statusBarItem.show();

    this.logger.debug({ fn: 'RangeLinkStatusBar.constructor' }, 'Status bar item created');
  }

  /**
   * Open the menu as a QuickPick.
   */
  async openMenu(): Promise<void> {
    const items = this.buildQuickPickItems();

    const selected = await this.ideAdapter.showQuickPick(items, {
      title: formatMessage(MessageCode.STATUS_BAR_MENU_TITLE),
      placeHolder: formatMessage(MessageCode.STATUS_BAR_MENU_PLACEHOLDER),
    });

    if (selected?.command) {
      if (selected.command === CMD_BOOKMARK_NAVIGATE && selected.bookmarkId) {
        await this.pasteBookmarkToDestination(selected.bookmarkId);
      } else {
        await this.ideAdapter.executeCommand(selected.command);
      }
      this.logger.debug(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: selected },
        'Menu item selected',
      );
    }
  }

  /**
   * Copy bookmark link to clipboard and paste to bound destination.
   */
  private async pasteBookmarkToDestination(bookmarkId: BookmarkId): Promise<void> {
    const bookmark = this.bookmarksStore.getById(bookmarkId);
    if (!bookmark) {
      this.logger.warn(
        { fn: 'RangeLinkStatusBar.pasteBookmarkToDestination', bookmarkId },
        'Bookmark not found',
      );
      return;
    }

    await this.bookmarksStore.recordAccess(bookmarkId);
    await this.ideAdapter.writeTextToClipboard(bookmark.link);

    if (this.destinationManager.isBound()) {
      await this.destinationManager.sendTextToDestination(
        bookmark.link,
        `Bookmark pasted: ${bookmark.label}`,
      );
      this.logger.debug(
        {
          fn: 'RangeLinkStatusBar.pasteBookmarkToDestination',
          bookmark,
          pastedToDestination: true,
        },
        `Pasted bookmark to destination: ${bookmark.label}`,
      );
    } else {
      this.logger.debug(
        {
          fn: 'RangeLinkStatusBar.pasteBookmarkToDestination',
          bookmark,
          pastedToDestination: false,
        },
        `Copied bookmark to clipboard (no destination bound): ${bookmark.label}`,
      );
    }
  }

  /**
   * Build QuickPick items with context-aware enabled/disabled states.
   *
   * Items without a `command` property are disabled.
   */
  private buildQuickPickItems(): MenuQuickPickItem[] {
    const isBound = this.destinationManager.isBound();
    const boundDest = this.destinationManager.getBoundDestination();

    const result: MenuQuickPickItem[] = [];

    if (isBound && boundDest) {
      result.push({
        label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_JUMP_ENABLED_LABEL),
        description: `→ ${boundDest.displayName}`,
        command: CMD_JUMP_TO_DESTINATION,
      });
    } else {
      result.push({
        label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_JUMP_DISABLED_LABEL),
        description: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_JUMP_DISABLED_DESC),
      });
    }

    result.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    });

    result.push(...this.buildBookmarksQuickPickItems());

    result.push({
      label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_VERSION_INFO_LABEL),
      command: CMD_SHOW_VERSION,
    });

    return result;
  }

  private buildBookmarksQuickPickItems(): MenuQuickPickItem[] {
    const result: MenuQuickPickItem[] = [];
    const bookmarks = this.bookmarksStore.getAll();
    const countSuffix = bookmarks.length > 0 ? ` (${bookmarks.length})` : '';

    result.push({
      label: formatMessage(MessageCode.STATUS_BAR_MENU_BOOKMARKS_SECTION_LABEL) + countSuffix,
      kind: vscode.QuickPickItemKind.Separator,
    });

    if (bookmarks.length === 0) {
      result.push({
        label: `    ${formatMessage(MessageCode.STATUS_BAR_MENU_BOOKMARKS_EMPTY)}`,
      });
    } else {
      for (const bookmark of bookmarks) {
        result.push({
          label: `    $(file) ${bookmark.label}`,
          description: bookmark.description,
          command: CMD_BOOKMARK_NAVIGATE,
          bookmarkId: bookmark.id,
        });
      }
    }

    result.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    });

    result.push({
      label: `    ${formatMessage(MessageCode.STATUS_BAR_MENU_BOOKMARKS_ADD_CURRENT)}`,
      command: CMD_BOOKMARK_ADD,
    });

    result.push({
      label: `    ${formatMessage(MessageCode.STATUS_BAR_MENU_BOOKMARKS_MANAGE)}`,
      command: CMD_BOOKMARK_MANAGE,
    });

    result.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    });

    return result;
  }

  dispose(): void {
    this.statusBarItem.dispose();
    this.logger.debug({ fn: 'RangeLinkStatusBar.dispose' }, 'Status bar disposed');
  }
}
