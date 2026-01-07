import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { BookmarkId } from '../bookmarks';
import type { BookmarkService } from '../bookmarks';
import {
  CMD_BOOKMARK_ADD,
  CMD_BOOKMARK_MANAGE,
  CMD_BOOKMARK_NAVIGATE,
  CMD_JUMP_TO_DESTINATION,
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_SHOW_VERSION,
} from '../constants';
import type { DestinationAvailabilityService } from '../destinations/DestinationAvailabilityService';
import type { DestinationType } from '../destinations/PasteDestination';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

/**
 * QuickPick item with optional command or destinationType to execute on selection.
 */
interface MenuQuickPickItem extends vscode.QuickPickItem {
  command?: string;
  bookmarkId?: BookmarkId;
  destinationType?: DestinationType;
}

/**
 * Status bar priority - higher values appear more to the left.
 * 100 is a reasonable default that places RangeLink near other extension items.
 */
const STATUS_BAR_PRIORITY = 100;

/**
 * Indentation prefix for nested menu items (4 spaces).
 */
const MENU_ITEM_INDENT = '    ';

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
    private readonly availabilityService: DestinationAvailabilityService,
    private readonly bookmarkService: BookmarkService,
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
    const items = await this.buildQuickPickItems();

    const selected = await this.ideAdapter.showQuickPick(items, {
      title: formatMessage(MessageCode.STATUS_BAR_MENU_TITLE),
      placeHolder: formatMessage(MessageCode.STATUS_BAR_MENU_PLACEHOLDER),
    });

    if (selected?.destinationType) {
      const success = await this.destinationManager.bindAndJump(selected.destinationType);
      this.logger.debug(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: selected, bindAndJumpSuccess: success },
        'Destination item selected',
      );
    } else if (selected?.command) {
      if (selected.command === CMD_BOOKMARK_NAVIGATE && selected.bookmarkId) {
        await this.bookmarkService.pasteBookmark(selected.bookmarkId);
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
   * Build QuickPick items with context-aware enabled/disabled states.
   *
   * Items without a `command` or `destinationType` property are disabled.
   */
  private async buildQuickPickItems(): Promise<MenuQuickPickItem[]> {
    return [
      ...(await this.buildJumpOrDestinationsSection()),
      ...this.buildBookmarksQuickPickItems(),
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_VERSION_INFO_LABEL),
        command: CMD_SHOW_VERSION,
      },
    ];
  }

  /**
   * Build the jump item (when bound) or inline destinations (when unbound).
   */
  private async buildJumpOrDestinationsSection(): Promise<MenuQuickPickItem[]> {
    const boundDest = this.destinationManager.getBoundDestination();
    if (boundDest) {
      return [
        {
          label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_JUMP_ENABLED_LABEL),
          description: `→ ${boundDest.displayName}`,
          command: CMD_JUMP_TO_DESTINATION,
        },
      ];
    }
    return this.buildDestinationsQuickPickItems();
  }

  /**
   * Build QuickPick items for available destinations when unbound.
   */
  private async buildDestinationsQuickPickItems(): Promise<MenuQuickPickItem[]> {
    const result: MenuQuickPickItem[] = [];
    const availableDestinations = await this.availabilityService.getAvailableDestinations();

    if (availableDestinations.length === 0) {
      result.push({
        label: formatMessage(MessageCode.STATUS_BAR_MENU_DESTINATIONS_NONE_AVAILABLE),
      });
    } else {
      result.push({
        label: formatMessage(MessageCode.STATUS_BAR_MENU_DESTINATIONS_CHOOSE_BELOW),
      });
      for (const dest of availableDestinations) {
        result.push({
          label: `${MENU_ITEM_INDENT}$(arrow-right) ${dest.displayName}`,
          destinationType: dest.type,
        });
      }
    }

    return result;
  }

  private buildBookmarksQuickPickItems(): MenuQuickPickItem[] {
    const result: MenuQuickPickItem[] = [];
    const bookmarks = this.bookmarkService.getAllBookmarks();

    result.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    });

    result.push({
      label: formatMessage(MessageCode.STATUS_BAR_MENU_BOOKMARKS_SECTION_LABEL),
    });

    if (bookmarks.length === 0) {
      result.push({
        label: `${MENU_ITEM_INDENT}${formatMessage(MessageCode.BOOKMARK_LIST_EMPTY)}`,
      });
    } else {
      for (const bookmark of bookmarks) {
        result.push({
          label: `${MENU_ITEM_INDENT}$(bookmark) ${bookmark.label}`,
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
      label: `${MENU_ITEM_INDENT}${formatMessage(MessageCode.BOOKMARK_ACTION_ADD)}`,
      command: CMD_BOOKMARK_ADD,
    });

    result.push({
      label: `${MENU_ITEM_INDENT}${formatMessage(MessageCode.BOOKMARK_ACTION_MANAGE)}`,
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
