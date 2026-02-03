import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import {
  showTerminalPicker,
  TERMINAL_PICKER_SHOW_ALL,
  type TerminalPickerOptions,
} from '../../../destinations/utils';
import { createMockTerminal, createMockVscodeAdapter } from '../../helpers';

const identityCallback = (terminal: vscode.Terminal): vscode.Terminal => terminal;

const DEFAULT_OPTIONS: TerminalPickerOptions = {
  maxItemsBeforeMore: 5,
  title: 'Select Terminal',
  placeholder: 'Choose a terminal to bind to',
  activeDescription: '(active)',
  moreTerminalsLabel: 'More terminals...',
  formatMoreDescription: (count) => `${count} more`,
};

describe('showTerminalPicker', () => {
  const createTerminals = (count: number): vscode.Terminal[] =>
    Array.from({ length: count }, (_, i) => createMockTerminal({ name: `terminal-${i + 1}` }));

  describe('2-5 terminals (shows all)', () => {
    it('shows QuickPick with all terminals when 2 terminals exist', async () => {
      const terminals = createTerminals(2);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-1',
        terminal: terminals[0],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(result).toStrictEqual({ outcome: 'selected', result: terminals[0] });
      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: undefined,
            terminal: terminals[1],
            itemKind: 'terminal',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });

    it('shows QuickPick with all terminals when 5 terminals exist', async () => {
      const terminals = createTerminals(5);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-3',
        terminal: terminals[2],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(result).toStrictEqual({ outcome: 'selected', result: terminals[2] });
      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: undefined,
            terminal: terminals[1],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-3',
            description: undefined,
            terminal: terminals[2],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-4',
            description: undefined,
            terminal: terminals[3],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-5',
            description: undefined,
            terminal: terminals[4],
            itemKind: 'terminal',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });

    it('marks active terminal with "(active)" description', async () => {
      const terminals = createTerminals(3);
      const activeTerminal = terminals[1];
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-2',
        description: '(active)',
        terminal: activeTerminal,
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        activeTerminal,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: '(active)',
            terminal: terminals[1],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-3',
            description: undefined,
            terminal: terminals[2],
            itemKind: 'terminal',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });
  });

  describe('>5 terminals (max-5 rule)', () => {
    it('shows 5 terminals + "More terminals..." when 6 terminals exist', async () => {
      const terminals = createTerminals(6);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-2',
        terminal: terminals[1],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: undefined,
            terminal: terminals[1],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-3',
            description: undefined,
            terminal: terminals[2],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-4',
            description: undefined,
            terminal: terminals[3],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-5',
            description: undefined,
            terminal: terminals[4],
            itemKind: 'terminal',
          },
          {
            label: 'More terminals...',
            displayName: 'More terminals...',
            remainingCount: 1,
            description: '1 more',
            itemKind: 'terminal-more',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });

    it('shows correct count in "More terminals..." description for many terminals', async () => {
      const terminals = createTerminals(10);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-1',
        terminal: terminals[0],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: undefined,
            terminal: terminals[1],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-3',
            description: undefined,
            terminal: terminals[2],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-4',
            description: undefined,
            terminal: terminals[3],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-5',
            description: undefined,
            terminal: terminals[4],
            itemKind: 'terminal',
          },
          {
            label: 'More terminals...',
            displayName: 'More terminals...',
            remainingCount: 5,
            description: '5 more',
            itemKind: 'terminal-more',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });
  });

  describe('custom maxItemsBeforeMore option', () => {
    it('uses custom threshold when specified', async () => {
      const terminals = createTerminals(4);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-1',
        terminal: terminals[0],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        { ...DEFAULT_OPTIONS, maxItemsBeforeMore: 3 },
        logger,
        identityCallback,
      );

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: undefined,
            terminal: terminals[1],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-3',
            description: undefined,
            terminal: terminals[2],
            itemKind: 'terminal',
          },
          {
            label: 'More terminals...',
            displayName: 'More terminals...',
            remainingCount: 1,
            description: '1 more',
            itemKind: 'terminal-more',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });

    it('shows all terminals when count equals threshold', async () => {
      const terminals = createTerminals(3);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-1',
        terminal: terminals[0],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        { ...DEFAULT_OPTIONS, maxItemsBeforeMore: 3 },
        logger,
        identityCallback,
      );

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: undefined,
            terminal: terminals[1],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-3',
            description: undefined,
            terminal: terminals[2],
            itemKind: 'terminal',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });

    it('TERMINAL_PICKER_SHOW_ALL shows all terminals without "More..." grouping', async () => {
      const terminals = createTerminals(8);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-5',
        terminal: terminals[4],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        { ...DEFAULT_OPTIONS, maxItemsBeforeMore: TERMINAL_PICKER_SHOW_ALL },
        logger,
        identityCallback,
      );

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: undefined,
            terminal: terminals[1],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-3',
            description: undefined,
            terminal: terminals[2],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-4',
            description: undefined,
            terminal: terminals[3],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-5',
            description: undefined,
            terminal: terminals[4],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-6',
            description: undefined,
            terminal: terminals[5],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-7',
            description: undefined,
            terminal: terminals[6],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-8',
            description: undefined,
            terminal: terminals[7],
            itemKind: 'terminal',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });
  });

  describe('"More terminals..." selection', () => {
    it('opens secondary picker with all terminals when "More terminals..." selected', async () => {
      const terminals = createTerminals(7);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock
        .mockResolvedValueOnce({ label: 'More terminals...', itemKind: 'terminal-more' })
        .mockResolvedValueOnce({
          label: 'terminal-6',
          terminal: terminals[5],
          itemKind: 'terminal',
        });
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(result).toStrictEqual({ outcome: 'selected', result: terminals[5] });
      expect(showQuickPickMock).toHaveBeenNthCalledWith(
        2,
        [
          {
            label: 'terminal-1',
            description: undefined,
            terminal: terminals[0],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-2',
            description: undefined,
            terminal: terminals[1],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-3',
            description: undefined,
            terminal: terminals[2],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-4',
            description: undefined,
            terminal: terminals[3],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-5',
            description: undefined,
            terminal: terminals[4],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-6',
            description: undefined,
            terminal: terminals[5],
            itemKind: 'terminal',
          },
          {
            label: 'terminal-7',
            description: undefined,
            terminal: terminals[6],
            itemKind: 'terminal',
          },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 7 },
        'User selected "More terminals...", showing full list',
      );
    });

    it('returns returned-to-destination-picker when escaping secondary picker', async () => {
      const terminals = createTerminals(6);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock
        .mockResolvedValueOnce({ label: 'More terminals...', itemKind: 'terminal-more' })
        .mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(result).toStrictEqual({ outcome: 'returned-to-destination-picker' });
    });
  });

  describe('cancellation', () => {
    it('returns cancelled when user escapes primary picker', async () => {
      const terminals = createTerminals(3);
      const adapter = createMockVscodeAdapter();
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(result).toStrictEqual({ outcome: 'cancelled' });
    });
  });

  describe('logging', () => {
    it('logs when showing terminal picker', async () => {
      const terminals = createTerminals(3);
      const adapter = createMockVscodeAdapter();
      adapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce({
        label: 'terminal-1',
        terminal: terminals[0],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 3, itemCount: 3 },
        'Showing terminal picker',
      );
    });

    it('logs when user cancels picker', async () => {
      const terminals = createTerminals(2);
      const adapter = createMockVscodeAdapter();
      adapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 2 },
        'User cancelled terminal picker',
      );
    });

    it('logs when terminal selected', async () => {
      const terminals = createTerminals(2);
      const adapter = createMockVscodeAdapter();
      adapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce({
        label: 'terminal-2',
        terminal: terminals[1],
        itemKind: 'terminal',
      });
      const logger = createMockLogger();

      await showTerminalPicker(
        terminals,
        undefined,
        adapter,
        DEFAULT_OPTIONS,
        logger,
        identityCallback,
      );

      expect(logger.debug).toHaveBeenCalledWith(
        {
          fn: 'showTerminalPicker',
          selected: {
            label: 'terminal-2',
            terminal: terminals[1],
            itemKind: 'terminal',
          },
        },
        'Terminal selected',
      );
    });
  });
});
