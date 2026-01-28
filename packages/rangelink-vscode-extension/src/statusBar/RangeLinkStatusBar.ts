import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { BookmarkId } from '../bookmarks';
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
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { NonTerminalDestinationType, PickerItemKind } from '../types';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

/**
 * QuickPick item for status bar menu.
 * Combines destination picker fields with menu-specific fields (command, bookmarkId).
 */
interface MenuQuickPickItem extends vscode.QuickPickItem {
  readonly itemKind?: PickerItemKind;
  readonly destinationType?: NonTerminalDestinationType;
  readonly terminal?: vscode.Terminal;
  readonly command?: string;
  readonly bookmarkId?: BookmarkId;
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

    if (!selected) {
      this.logger.debug({ fn: 'RangeLinkStatusBar.openMenu' }, 'User dismissed menu');
      return;
    }

    if (selected.itemKind === 'terminal' && selected.terminal) {
      const success = await this.destinationManager.bindAndJump({
        type: 'terminal',
        terminal: selected.terminal,
      });
      this.logger.debug(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: selected.label,
          terminalName: selected.terminal.name,
          bindAndJumpSuccess: success,
        },
        'Terminal item selected',
      );
    } else if (selected.itemKind === 'terminal-more') {
      this.logger.debug(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: selected.label },
        '"More terminals..." selected, delegating to jumpToBoundDestination',
      );
      await this.destinationManager.jumpToBoundDestination();
    } else if (selected.destinationType) {
      const success = await this.destinationManager.bindAndJump({
        type: selected.destinationType as NonTerminalDestinationType,
      });
      this.logger.debug(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: selected, bindAndJumpSuccess: success },
        'Destination item selected',
      );
    } else if (selected.command) {
      if (selected.command === CMD_BOOKMARK_NAVIGATE && selected.bookmarkId) {
        await this.bookmarkService.pasteBookmark(selected.bookmarkId);
      } else {
        await this.ideAdapter.executeCommand(selected.command);
      }
      this.logger.debug(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: selected },
        'Menu item selected',
      );
    } else {
      this.logger.debug(
        { fn: 'RangeLinkStatusBar.openMenu', selectedItem: selected },
        'Non-actionable item selected',
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
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_NAVIGATE_TO_LINK_LABEL),
        command: CMD_GO_TO_RANGELINK,
      },
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
    const availableItems = await this.availabilityService.getAvailableDestinationItems();

    if (availableItems.length === 0) {
      result.push({
        label: formatMessage(MessageCode.STATUS_BAR_MENU_DESTINATIONS_NONE_AVAILABLE),
      });
    } else {
      result.push({
        label: formatMessage(MessageCode.STATUS_BAR_MENU_DESTINATIONS_CHOOSE_BELOW),
      });

      for (const item of availableItems) {
        switch (item.kind) {
          case 'destination':
            result.push({
              label: `${MENU_ITEM_INDENT}$(arrow-right) ${item.displayName}`,
              destinationType: item.destinationType,
              itemKind: 'destination',
            });
            break;

          case 'terminal':
            result.push({
              label: `${MENU_ITEM_INDENT}$(arrow-right) Terminal "${item.displayName}"`,
              description: item.isActive
                ? formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION)
                : undefined,
              terminal: item.terminal,
              itemKind: 'terminal',
            });
            break;

          case 'terminal-more':
            result.push({
              label: `${MENU_ITEM_INDENT}$(arrow-right) ${item.displayName}`,
              description: formatMessage(MessageCode.TERMINAL_PICKER_MORE_TERMINALS_DESCRIPTION, {
                count: item.remainingCount,
              }),
              itemKind: 'terminal-more',
            });
            break;
        }
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
