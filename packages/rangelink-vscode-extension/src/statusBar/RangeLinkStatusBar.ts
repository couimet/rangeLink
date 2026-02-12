import type { Logger, LoggingContext } from 'barebone-logger';
import * as vscode from 'vscode';

import type { BookmarkService } from '../bookmarks';
import {
  CMD_BOOKMARK_ADD,
  CMD_BOOKMARK_MANAGE,
  CMD_JUMP_TO_DESTINATION,
  CMD_GO_TO_RANGELINK,
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_SHOW_VERSION,
} from '../constants';
import {
  buildDestinationQuickPickItems,
  type DestinationAvailabilityService,
  type PasteDestinationManager,
} from '../destinations';
import {
  showTerminalPicker,
  TERMINAL_PICKER_SHOW_ALL,
  type TerminalPickerOptions,
} from '../destinations/utils';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  type BookmarkQuickPickItem,
  type CommandQuickPickItem,
  type DestinationQuickPickItem,
  type InfoQuickPickItem,
  MessageCode,
  type StatusBarMenuQuickPickItem,
} from '../types';
import { formatMessage, isSelectableQuickPickItem } from '../utils';

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

    if (!isSelectableQuickPickItem<StatusBarMenuQuickPickItem>(selected)) {
      this.logger.debug({ fn: 'RangeLinkStatusBar.openMenu' }, 'User dismissed menu');
      return;
    }

    await this.handleSelection(selected);
  }

  private async handleSelection(selected: StatusBarMenuQuickPickItem): Promise<void> {
    const logCtx = { fn: 'RangeLinkStatusBar.openMenu', selectedItem: selected };

    switch (selected.itemKind) {
      case 'bindable': {
        const result = await this.destinationManager.bindAndFocus(selected.bindOptions);
        this.logger.debug(
          { ...logCtx, bindAndFocusSuccess: result.success },
          'Destination item selected',
        );
        break;
      }
      case 'terminal-more':
        this.logger.debug(logCtx, 'Terminal overflow item selected');
        await this.showSecondaryTerminalPicker(logCtx);
        break;
      case 'command':
        await this.ideAdapter.executeCommand(selected.command);
        this.logger.debug(logCtx, 'Command item selected');
        break;
      case 'bookmark':
        await this.bookmarkService.pasteBookmark(selected.bookmarkId);
        this.logger.debug(logCtx, 'Bookmark item selected');
        break;
      case 'info':
        this.logger.debug(logCtx, 'Non-actionable item selected');
        break;
      default: {
        const _exhaustiveCheck: never = selected;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_ITEM_KIND,
          message: 'Unhandled item kind in status bar menu',
          functionName: 'RangeLinkStatusBar.handleSelection',
          details: { selectedItem: _exhaustiveCheck },
        });
      }
    }
  }

  /**
   * Show the full terminal list after user selects "More terminals...".
   * Re-opens the status bar menu if the user escapes.
   */
  private async showSecondaryTerminalPicker(logCtx: LoggingContext): Promise<void> {
    const terminalItems = await this.availabilityService.getTerminalItems(Infinity);

    const options: TerminalPickerOptions = {
      maxItemsBeforeMore: TERMINAL_PICKER_SHOW_ALL,
      title: formatMessage(MessageCode.TERMINAL_PICKER_TITLE),
      placeholder: formatMessage(MessageCode.TERMINAL_PICKER_BIND_ONLY_PLACEHOLDER),
      activeDescription: formatMessage(MessageCode.TERMINAL_PICKER_ACTIVE_DESCRIPTION),
      moreTerminalsLabel: formatMessage(MessageCode.TERMINAL_PICKER_MORE_LABEL),
    };

    const result = await showTerminalPicker(
      terminalItems,
      this.ideAdapter,
      options,
      this.logger,
      (eligible) => ({ kind: 'terminal' as const, terminal: eligible.terminal }),
    );

    switch (result.outcome) {
      case 'selected': {
        const bindResult = await this.destinationManager.bindAndFocus(result.result);
        this.logger.debug(
          { ...logCtx, bindAndFocusSuccess: bindResult.success },
          'Terminal selected from overflow picker',
        );
        break;
      }
      case 'cancelled':
      case 'returned-to-destination-picker':
        this.logger.debug(logCtx, 'User returned from terminal picker, re-opening menu');
        await this.openMenu();
        break;
      default: {
        const _exhaustiveCheck: never = result;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: 'Unexpected terminal picker result outcome',
          functionName: 'RangeLinkStatusBar.showSecondaryTerminalPicker',
          details: { result: _exhaustiveCheck },
        });
      }
    }
  }

  /**
   * Build QuickPick items with context-aware enabled/disabled states.
   */
  private async buildQuickPickItems(): Promise<
    (StatusBarMenuQuickPickItem | vscode.QuickPickItem)[]
  > {
    return [
      ...(await this.buildJumpOrDestinationsSection()),
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_NAVIGATE_TO_LINK_LABEL),
        itemKind: 'command' as const,
        command: CMD_GO_TO_RANGELINK,
      },
      ...this.buildBookmarksQuickPickItems(),
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_VERSION_INFO_LABEL),
        itemKind: 'command' as const,
        command: CMD_SHOW_VERSION,
      },
    ];
  }

  /**
   * Build the jump item (when bound) or inline destinations (when unbound).
   */
  private async buildJumpOrDestinationsSection(): Promise<
    (StatusBarMenuQuickPickItem | vscode.QuickPickItem)[]
  > {
    const boundDest = this.destinationManager.getBoundDestination();
    if (boundDest) {
      return [
        {
          label: formatMessage(MessageCode.STATUS_BAR_MENU_ITEM_JUMP_ENABLED_LABEL),
          description: `→ ${boundDest.displayName}`,
          itemKind: 'command' as const,
          command: CMD_JUMP_TO_DESTINATION,
        },
      ];
    }
    return this.buildDestinationsQuickPickItems();
  }

  /**
   * Build QuickPick items for available destinations when unbound.
   */
  private async buildDestinationsQuickPickItems(): Promise<
    (DestinationQuickPickItem | InfoQuickPickItem | vscode.QuickPickItem)[]
  > {
    const grouped = await this.availabilityService.getGroupedDestinationItems();
    const destinationItems = buildDestinationQuickPickItems(
      grouped,
      (displayName) => `${MENU_ITEM_INDENT}$(arrow-right) ${displayName}`,
    );

    if (destinationItems.length === 0) {
      return [
        {
          label: formatMessage(MessageCode.STATUS_BAR_MENU_DESTINATIONS_NONE_AVAILABLE),
          itemKind: 'info' as const,
        },
      ];
    }

    return [
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_DESTINATIONS_CHOOSE_BELOW),
        itemKind: 'info' as const,
      },
      ...destinationItems,
    ];
  }

  private buildBookmarksQuickPickItems(): (
    | BookmarkQuickPickItem
    | CommandQuickPickItem
    | InfoQuickPickItem
    | vscode.QuickPickItem
  )[] {
    const bookmarks = this.bookmarkService.getAllBookmarks();

    const bookmarkItems: (BookmarkQuickPickItem | InfoQuickPickItem)[] =
      bookmarks.length === 0
        ? [
            {
              label: `${MENU_ITEM_INDENT}${formatMessage(MessageCode.BOOKMARK_LIST_EMPTY)}`,
              itemKind: 'info' as const,
            },
          ]
        : bookmarks.map((bookmark) => ({
            label: `${MENU_ITEM_INDENT}$(bookmark) ${bookmark.label}`,
            itemKind: 'bookmark' as const,
            bookmarkId: bookmark.id,
          }));

    return [
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      {
        label: formatMessage(MessageCode.STATUS_BAR_MENU_BOOKMARKS_SECTION_LABEL),
        itemKind: 'info' as const,
      },
      ...bookmarkItems,
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      {
        label: `${MENU_ITEM_INDENT}${formatMessage(MessageCode.BOOKMARK_ACTION_ADD)}`,
        itemKind: 'command' as const,
        command: CMD_BOOKMARK_ADD,
      },
      {
        label: `${MENU_ITEM_INDENT}${formatMessage(MessageCode.BOOKMARK_ACTION_MANAGE)}`,
        itemKind: 'command' as const,
        command: CMD_BOOKMARK_MANAGE,
      },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
    ];
  }

  dispose(): void {
    this.statusBarItem.dispose();
    this.logger.debug({ fn: 'RangeLinkStatusBar.dispose' }, 'Status bar disposed');
  }
}
