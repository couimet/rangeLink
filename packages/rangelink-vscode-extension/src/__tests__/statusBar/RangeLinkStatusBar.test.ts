import { createMockLogger } from 'barebone-logger-testing';
import * as vscode from 'vscode';

import { RangeLinkStatusBar } from '../../statusBar/RangeLinkStatusBar';
import {
  createMockDestinationManager,
  createMockStatusBarItem,
  createMockTerminalPasteDestination,
  createMockVscodeAdapter,
} from '../helpers';

/**
 * Semantic constant for when user dismisses QuickPick (Escape or click outside).
 * VSCode's showQuickPick returns undefined in this case.
 */
const QUICK_PICK_DISMISSED = undefined;

describe('RangeLinkStatusBar', () => {
  let createStatusBarItemMock: jest.Mock;
  let showQuickPickMock: jest.Mock;
  let executeCommandMock: jest.Mock;
  let mockStatusBarItem: ReturnType<typeof createMockStatusBarItem>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;

  beforeEach(() => {
    mockStatusBarItem = createMockStatusBarItem();
    mockLogger = createMockLogger();
    createStatusBarItemMock = jest.fn(() => mockStatusBarItem);
    showQuickPickMock = jest.fn().mockResolvedValue(undefined);
    executeCommandMock = jest.fn().mockResolvedValue(undefined);
    mockAdapter = createMockVscodeAdapter({
      windowOptions: {
        createStatusBarItem: createStatusBarItemMock,
        showQuickPick: showQuickPickMock,
      },
      commandsOptions: {
        executeCommand: executeCommandMock,
      },
    });
  });

  describe('constructor', () => {
    it('creates and configures status bar item', () => {
      const mockDestinationManager = createMockDestinationManager();

      new RangeLinkStatusBar(mockAdapter, mockDestinationManager, mockLogger);

      expect(createStatusBarItemMock).toHaveBeenCalledTimes(1);
      expect(createStatusBarItemMock).toHaveBeenCalledWith(vscode.StatusBarAlignment.Right, 100);
      expect(mockStatusBarItem.text).toBe('$(link) RangeLink');
      expect(mockStatusBarItem.tooltip).toBe('RangeLink Menu');
      expect(mockStatusBarItem.command).toBe('rangelink.openStatusBarMenu');
      expect(mockStatusBarItem.show).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.constructor' },
        'Status bar item created',
      );
    });
  });

  /**
   * Menu content tests: Verify exact items passed to QuickPick.
   * These freeze the user-facing contract (labels, descriptions, commands).
   */
  describe('openMenu - menu content', () => {
    it('shows disabled Jump item when no destination is bound', async () => {
      const mockDestinationManager = createMockDestinationManager({
        isBound: false,
      });
      const statusBar = new RangeLinkStatusBar(mockAdapter, mockDestinationManager, mockLogger);

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledTimes(1);
      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: '$(circle-slash) Jump to Bound Destination',
            description: '(no destination bound)',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(info) Show Version Info', command: 'rangelink.showVersion' },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });

    it('shows enabled Jump item when destination is bound', async () => {
      const mockBoundDestination = createMockTerminalPasteDestination({
        displayName: 'Terminal ("zsh")',
      });
      const mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: mockBoundDestination,
      });
      const statusBar = new RangeLinkStatusBar(mockAdapter, mockDestinationManager, mockLogger);

      await statusBar.openMenu();

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: '$(arrow-right) Jump to Bound Destination',
            description: '→ Terminal ("zsh")',
            command: 'rangelink.jumpToBoundDestination',
          },
          { label: '', kind: vscode.QuickPickItemKind.Separator },
          { label: '$(info) Show Version Info', command: 'rangelink.showVersion' },
        ],
        { title: 'RangeLink', placeHolder: 'Select an action' },
      );
    });
  });

  /**
   * Selection behavior tests: Verify openMenu() handles selections correctly.
   * Uses synthetic items (not real menu items) to test the `if (selected?.command)` logic
   * independently of actual menu content.
   */
  describe('openMenu - selection behavior', () => {
    it('executes command and logs when item with command is selected', async () => {
      const mockDestinationManager = createMockDestinationManager();
      showQuickPickMock.mockResolvedValue({
        label: 'Synthetic Item',
        command: 'synthetic.testCommand',
      });
      const statusBar = new RangeLinkStatusBar(mockAdapter, mockDestinationManager, mockLogger);

      await statusBar.openMenu();

      expect(executeCommandMock).toHaveBeenCalledTimes(1);
      expect(executeCommandMock).toHaveBeenCalledWith('synthetic.testCommand');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'RangeLinkStatusBar.openMenu',
          selectedItem: { label: 'Synthetic Item', command: 'synthetic.testCommand' },
        },
        'Menu item selected',
      );
    });

    it('does not execute command or log when item without command is selected', async () => {
      const mockDestinationManager = createMockDestinationManager();
      showQuickPickMock.mockResolvedValue({
        label: 'Synthetic Disabled Item',
      });
      const statusBar = new RangeLinkStatusBar(mockAdapter, mockDestinationManager, mockLogger);
      (mockLogger.debug as jest.Mock).mockClear();

      await statusBar.openMenu();

      expect(executeCommandMock).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('does not execute command or log when user dismisses QuickPick', async () => {
      const mockDestinationManager = createMockDestinationManager();
      showQuickPickMock.mockResolvedValue(QUICK_PICK_DISMISSED);
      const statusBar = new RangeLinkStatusBar(mockAdapter, mockDestinationManager, mockLogger);
      (mockLogger.debug as jest.Mock).mockClear();

      await statusBar.openMenu();

      expect(executeCommandMock).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('disposes status bar item and logs', () => {
      const mockDestinationManager = createMockDestinationManager();
      const statusBar = new RangeLinkStatusBar(mockAdapter, mockDestinationManager, mockLogger);

      statusBar.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'RangeLinkStatusBar.dispose' },
        'Status bar disposed',
      );
    });
  });
});
