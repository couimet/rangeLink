import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { BookmarkService } from '../bookmarks';
import {
  CMD_BOOKMARK_ADD,
  CMD_BOOKMARK_MANAGE,
  CMD_BOOKMARK_NAVIGATE,
  CMD_JUMP_TO_DESTINATION,
  CMD_GO_TO_RANGELINK,
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_SHOW_VERSION,
} from '../constants';
import type { DestinationAvailabilityService } from '../destinations/DestinationAvailabilityService';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { buildDestinationQuickPickItems } from '../destinations/utils';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  type BindableQuickPickItem,
  type BookmarkCommandQuickPickItem,
  type CommandQuickPickItem,
  type InfoQuickPickItem,
  MessageCode,
  type TerminalMoreQuickPickItem,
} from '../types';
import { formatMessage } from '../utils/formatMessage';

type StatusBarMenuQuickPickItem =
  | BindableQuickPickItem
  | TerminalMoreQuickPickItem
  | CommandQuickPickItem
  | BookmarkCommandQuickPickItem
  | InfoQuickPickItem;

/**
 * Union of all menu item types (selectable items + VS Code separators).
 */
type MenuQuickPickItem =
  | StatusBarMenuQuickPickItem
  | (vscode.QuickPickItem & { kind: vscode.QuickPickItemKind.Separator });

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

    if (!selected) {
      this.logger.debug({ fn: 'RangeLinkStatusBar.openMenu' }, 'User dismissed menu');
      return;
    }

    const selectable = selected as StatusBarMenuQuickPickItem;

    switch (selectable.itemKind) {
      case 'bindable': {
        const result = await this.destinationManager.bindAndFocus(selectable.bindOptions);
        this.logger.debug(
          { fn: 'RangeLinkStatusBar.openMenu', selectable, result: result.toJSON() },
          'Bindable item selected, bindAndFocus completed',
        );
        break;
      }

      case 'terminal-more':
        // TODO(#255): Implement secondary terminal picker flow
        this.logger.debug(
          { fn: 'RangeLinkStatusBar.openMenu', selectable },
          '"More terminals..." selected - secondary picker not yet implemented',
        );
        break;

      case 'command': {
        this.logger.debug(
          { fn: 'RangeLinkStatusBar.openMenu', selectable },
          'Command item selected',
        );
        if ('bookmarkId' in selectable) {
          await this.bookmarkService.pasteBookmark(selectable.bookmarkId);
        } else {
          await this.ideAdapter.executeCommand(selectable.command);
        }
        break;
      }

      case 'info':
        this.logger.debug(
          { fn: 'RangeLinkStatusBar.openMenu', selectable },
          'Non-actionable info item selected',
        );
        break;

      default: {
        const _exhaustiveCheck: never = selectable;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_ITEM_KIND,
          message: 'Unhandled item kind in status bar menu',
          functionName: 'RangeLinkStatusBar.openMenu',
          details: { selectedItem: _exhaustiveCheck },
        });
      }
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
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      },
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_NAVIGATE_TO_LINK_LABEL),
        command: CMD_GO_TO_RANGELINK,
        itemKind: 'command',
      },
      ...this.buildBookmarksQuickPickItems(),
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_VERSION_INFO_LABEL),
        command: CMD_SHOW_VERSION,
        itemKind: 'command',
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
          itemKind: 'command',
        },
      ];
    }
    return this.buildDestinationsQuickPickItems();
  }

  /**
   * Build QuickPick items for available destinations when unbound.
   * Uses grouped API to get pre-built items with displayName and bindOptions.
   */
  private async buildDestinationsQuickPickItems(): Promise<MenuQuickPickItem[]> {
    const grouped = await this.availabilityService.getGroupedDestinationItems();

    const hasAnyItems = Object.keys(grouped).length > 0;

    if (!hasAnyItems) {
      return [
        {
          label: formatMessage(MessageCode.STATUS_BAR_MENU_DESTINATIONS_NONE_AVAILABLE),
          itemKind: 'info',
        },
      ];
    }

    const destinationItems = buildDestinationQuickPickItems(
      grouped,
      (name) => `${MENU_ITEM_INDENT}$(arrow-right) ${name}`,
    );

    return [
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_DESTINATIONS_CHOOSE_BELOW),
        itemKind: 'info',
      },
      ...destinationItems,
    ];
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
      itemKind: 'info',
    });

    if (bookmarks.length === 0) {
      result.push({
        label: `${MENU_ITEM_INDENT}${formatMessage(MessageCode.BOOKMARK_LIST_EMPTY)}`,
        itemKind: 'info',
      });
    } else {
      for (const bookmark of bookmarks) {
        result.push({
          label: `${MENU_ITEM_INDENT}$(bookmark) ${bookmark.label}`,
          command: CMD_BOOKMARK_NAVIGATE,
          bookmarkId: bookmark.id,
          itemKind: 'command',
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
      itemKind: 'command',
    });

    result.push({
      label: `${MENU_ITEM_INDENT}${formatMessage(MessageCode.BOOKMARK_ACTION_MANAGE)}`,
      command: CMD_BOOKMARK_MANAGE,
      itemKind: 'command',
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
