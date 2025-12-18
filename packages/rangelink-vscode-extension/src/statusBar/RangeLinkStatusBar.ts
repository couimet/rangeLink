import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import { CMD_JUMP_TO_DESTINATION, CMD_OPEN_STATUS_BAR_MENU, CMD_SHOW_VERSION } from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode } from '../types/MessageCode';
import { formatMessage } from '../utils/formatMessage';

/**
 * QuickPick item with optional command to execute on selection.
 */
interface MenuQuickPickItem extends vscode.QuickPickItem {
  command?: string;
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
    private readonly logger: Logger,
  ) {
    this.statusBarItem = this.ideAdapter.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      STATUS_BAR_PRIORITY,
    );

    this.statusBarItem.text = '$(link) RangeLink';
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
      await this.ideAdapter.executeCommand(selected.command);
      this.logger.debug(
        { fn: 'RangeLinkStatusBar.openMenu', command: selected.command },
        'Menu item selected',
      );
    }
  }

  /**
   * Build QuickPick items with context-aware enabled/disabled states.
   *
   * Items without a `command` property are disabled - clicking them does nothing.
   */
  private buildQuickPickItems(): MenuQuickPickItem[] {
    const isBound = this.destinationManager.isBound();
    const boundDest = this.destinationManager.getBoundDestination();

    const result: MenuQuickPickItem[] = [];

    // Jump to Bound Destination - disabled when no destination bound
    if (isBound && boundDest) {
      result.push({
        label: '$(arrow-right) Jump to Bound Destination',
        description: `→ ${boundDest.displayName}`,
        command: CMD_JUMP_TO_DESTINATION,
      });
    } else {
      result.push({
        label: '$(circle-slash) Jump to Bound Destination',
        description: '(no destination bound)',
      });
    }

    result.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    });

    result.push({
      label: '$(info) Show Version Info',
      command: CMD_SHOW_VERSION,
    });

    return result;
  }

  dispose(): void {
    this.statusBarItem.dispose();
    this.logger.debug({ fn: 'RangeLinkStatusBar.dispose' }, 'Status bar disposed');
  }
}
