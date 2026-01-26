import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import { showTerminalPicker, type TerminalPickerOptions } from '../../../destinations/utils';
import { createMockTerminal, createMockVscodeAdapter } from '../../helpers';

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

  describe('edge cases', () => {
    it('returns undefined terminal when no terminals available', async () => {
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals: [] },
      });
      const logger = createMockLogger();

      const result = await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(result).toStrictEqual({
        terminal: undefined,
        cancelled: false,
        returnedToDestinationPicker: false,
      });
    });

    it('returns single terminal directly without showing picker', async () => {
      const terminal = createMockTerminal({ name: 'bash' });
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals: [terminal], activeTerminal: terminal },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      const logger = createMockLogger();

      const result = await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(result).toStrictEqual({
        terminal,
        cancelled: false,
        returnedToDestinationPicker: false,
      });
      expect(showQuickPickMock).not.toHaveBeenCalled();
    });
  });

  describe('2-5 terminals (shows all)', () => {
    it('shows QuickPick with all terminals when 2 terminals exist', async () => {
      const terminals = createTerminals(2);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({ label: 'terminal-1', terminal: terminals[0] });
      const logger = createMockLogger();

      const result = await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(result).toStrictEqual({
        terminal: terminals[0],
        cancelled: false,
        returnedToDestinationPicker: false,
      });
      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'terminal-1', description: undefined, terminal: terminals[0] },
          { label: 'terminal-2', description: undefined, terminal: terminals[1] },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });

    it('shows QuickPick with all terminals when 5 terminals exist', async () => {
      const terminals = createTerminals(5);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({ label: 'terminal-3', terminal: terminals[2] });
      const logger = createMockLogger();

      const result = await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(result.terminal).toBe(terminals[2]);
      expect(showQuickPickMock).toHaveBeenCalledTimes(1);
      const [items] = showQuickPickMock.mock.calls[0] as [{ label: string }[]];
      expect(items).toHaveLength(5);
      expect(items.some((item) => item.label === 'More terminals...')).toBe(false);
    });

    it('marks active terminal with "(active)" description', async () => {
      const terminals = createTerminals(3);
      const activeTerminal = terminals[1];
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals, activeTerminal },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({
        label: 'terminal-2',
        description: '(active)',
        terminal: activeTerminal,
      });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'terminal-1', description: undefined, terminal: terminals[0] },
          { label: 'terminal-2', description: '(active)', terminal: terminals[1] },
          { label: 'terminal-3', description: undefined, terminal: terminals[2] },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });
  });

  describe('>5 terminals (max-5 rule)', () => {
    it('shows 4 terminals + "More terminals..." when 6 terminals exist', async () => {
      const terminals = createTerminals(6);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({ label: 'terminal-2', terminal: terminals[1] });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(showQuickPickMock).toHaveBeenCalledWith(
        [
          { label: 'terminal-1', description: undefined, terminal: terminals[0] },
          { label: 'terminal-2', description: undefined, terminal: terminals[1] },
          { label: 'terminal-3', description: undefined, terminal: terminals[2] },
          { label: 'terminal-4', description: undefined, terminal: terminals[3] },
          { label: 'More terminals...', description: '2 more', isMoreItem: true },
        ],
        { title: 'Select Terminal', placeHolder: 'Choose a terminal to bind to' },
      );
    });

    it('shows correct count in "More terminals..." description for many terminals', async () => {
      const terminals = createTerminals(10);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({ label: 'terminal-1', terminal: terminals[0] });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      const [items] = showQuickPickMock.mock.calls[0] as [
        { label: string; description?: string }[],
      ];
      const moreItem = items.find((item) => item.label === 'More terminals...');
      expect(moreItem?.description).toBe('6 more');
    });
  });

  describe('custom maxItemsBeforeMore option', () => {
    it('uses custom threshold when specified', async () => {
      const terminals = createTerminals(4);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({ label: 'terminal-1', terminal: terminals[0] });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, { ...DEFAULT_OPTIONS, maxItemsBeforeMore: 3 }, logger);

      const [items] = showQuickPickMock.mock.calls[0] as [{ label: string }[]];
      expect(items).toHaveLength(3);
      expect(items[2].label).toBe('More terminals...');
    });

    it('shows all terminals when count equals threshold', async () => {
      const terminals = createTerminals(3);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce({ label: 'terminal-1', terminal: terminals[0] });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, { ...DEFAULT_OPTIONS, maxItemsBeforeMore: 3 }, logger);

      const [items] = showQuickPickMock.mock.calls[0] as [{ label: string }[]];
      expect(items).toHaveLength(3);
      expect(items.every((item) => item.label !== 'More terminals...')).toBe(true);
    });
  });

  describe('"More terminals..." selection', () => {
    it('opens secondary picker with all terminals when "More terminals..." selected', async () => {
      const terminals = createTerminals(7);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock
        .mockResolvedValueOnce({ label: 'More terminals...', isMoreItem: true })
        .mockResolvedValueOnce({ label: 'terminal-6', terminal: terminals[5] });
      const logger = createMockLogger();

      const result = await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(result).toStrictEqual({
        terminal: terminals[5],
        cancelled: false,
        returnedToDestinationPicker: false,
      });
      expect(showQuickPickMock).toHaveBeenCalledTimes(2);
      const [secondCallItems] = showQuickPickMock.mock.calls[1] as [{ label: string }[]];
      expect(secondCallItems).toHaveLength(7);
      expect(secondCallItems.every((item) => item.label !== 'More terminals...')).toBe(true);
    });

    it('returns returnedToDestinationPicker when escaping secondary picker', async () => {
      const terminals = createTerminals(6);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock
        .mockResolvedValueOnce({ label: 'More terminals...', isMoreItem: true })
        .mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(result).toStrictEqual({
        terminal: undefined,
        cancelled: false,
        returnedToDestinationPicker: true,
      });
    });
  });

  describe('cancellation', () => {
    it('returns cancelled when user escapes primary picker', async () => {
      const terminals = createTerminals(3);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      const showQuickPickMock = adapter.__getVscodeInstance().window.showQuickPick;
      showQuickPickMock.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(result).toStrictEqual({
        terminal: undefined,
        cancelled: true,
        returnedToDestinationPicker: false,
      });
    });
  });

  describe('logging', () => {
    it('logs when no terminals available', async () => {
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals: [] },
      });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 0 },
        'No terminals available',
      );
    });

    it('logs when single terminal returned directly', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals: [terminal] },
      });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 1 },
        'Single terminal available, returning directly',
      );
    });

    it('logs when showing terminal picker', async () => {
      const terminals = createTerminals(3);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      adapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce({
        label: 'terminal-1',
        terminal: terminals[0],
      });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 3, itemCount: 3 },
        'Showing terminal picker',
      );
    });

    it('logs when user cancels picker', async () => {
      const terminals = createTerminals(2);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      adapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 2 },
        'User cancelled terminal picker',
      );
    });

    it('logs when terminal selected', async () => {
      const terminals = createTerminals(2);
      const adapter = createMockVscodeAdapter({
        windowOptions: { terminals },
      });
      adapter.__getVscodeInstance().window.showQuickPick.mockResolvedValueOnce({
        label: 'terminal-2',
        terminal: terminals[1],
      });
      const logger = createMockLogger();

      await showTerminalPicker(adapter, DEFAULT_OPTIONS, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 2, selectedTerminal: 'terminal-2' },
        'Terminal selected',
      );
    });
  });
});
