import { createMockLogger } from 'barebone-logger-testing';

import type { TerminalPickerHandlers } from '../../../destinations/types';
import { buildTerminalPickerItems, showTerminalPicker } from '../../../destinations/utils';
import type { EligibleTerminal, TerminalBindableQuickPickItem } from '../../../types';
import {
  createMockQuickPickProvider,
  createMockTerminal,
  createMockTerminalQuickPickItem,
} from '../../helpers';

describe('showTerminalPicker', () => {
  const identityCallback = (eligible: EligibleTerminal): EligibleTerminal => eligible;

  const createHandlers = <T>(
    onSelected: (terminal: EligibleTerminal) => T | Promise<T>,
    overrides: Partial<TerminalPickerHandlers<T>> = {},
  ): TerminalPickerHandlers<T> => ({
    onSelected,
    getPlaceholder: () => 'Choose a terminal to bind to',
    ...overrides,
  });

  const createTerminalItems = (count: number): TerminalBindableQuickPickItem[] =>
    Array.from({ length: count }, (_, i) => {
      const terminal = createMockTerminal({ name: `terminal-${i + 1}` });
      return createMockTerminalQuickPickItem(terminal, false);
    });

  const reformattedItem = (item: TerminalBindableQuickPickItem) => ({
    label: item.terminalInfo.name,
    description: undefined,
    displayName: item.terminalInfo.name,
    bindOptions: item.bindOptions,
    itemKind: 'bindable',
    isActive: item.isActive,
    terminalInfo: item.terminalInfo,
  });

  describe('validation', () => {
    it('throws when called with empty terminal items', async () => {
      const quickPickProvider = createMockQuickPickProvider();
      const logger = createMockLogger();

      await expect(() =>
        showTerminalPicker([], quickPickProvider, createHandlers(identityCallback), logger),
      ).toThrowRangeLinkExtensionErrorAsync('TERMINAL_PICKER_EMPTY_ITEMS', {
        message: 'showTerminalPicker called with no terminal items',
        functionName: 'showTerminalPicker',
      });
      expect(quickPickProvider.showQuickPick).not.toHaveBeenCalled();
    });
  });

  describe('terminal selection', () => {
    it('shows QuickPick with all terminals and calls onSelected handler', async () => {
      const items = createTerminalItems(3);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(reformattedItem(items[1]));
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        items,
        quickPickProvider,
        createHandlers(identityCallback),
        logger,
      );

      expect(result).toStrictEqual(items[1].terminalInfo);
      expect(quickPickProvider.showQuickPick).toHaveBeenCalledWith(items.map(reformattedItem), {
        title: 'RangeLink',
        placeHolder: 'Choose a terminal to bind to',
      });
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 3, itemCount: 3 },
        'Showing terminal picker',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', selected: reformattedItem(items[1]) },
        'Terminal selected',
      );
    });

    it('passes handler return value through as result', async () => {
      const items = createTerminalItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(reformattedItem(items[0]));
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        items,
        quickPickProvider,
        createHandlers((terminal) => ({ kind: 'terminal' as const, name: terminal.name })),
        logger,
      );

      expect(result).toStrictEqual({ kind: 'terminal', name: 'terminal-1' });
    });

    it('supports async onSelected handler', async () => {
      const items = createTerminalItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(reformattedItem(items[0]));
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        items,
        quickPickProvider,
        createHandlers(async (terminal) => `bound-${terminal.name}`),
        logger,
      );

      expect(result).toBe('bound-terminal-1');
    });

    it('uses placeholder from getPlaceholder handler', async () => {
      const items = createTerminalItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(reformattedItem(items[0]));
      const logger = createMockLogger();

      await showTerminalPicker(
        items,
        quickPickProvider,
        createHandlers(identityCallback, {
          getPlaceholder: () => 'Custom placeholder text',
        }),
        logger,
      );

      expect(quickPickProvider.showQuickPick).toHaveBeenCalledWith(items.map(reformattedItem), {
        title: 'RangeLink',
        placeHolder: 'Custom placeholder text',
      });
    });

    it('marks active terminal with active description', async () => {
      const items = createTerminalItems(3);
      const activeTerminal = items[1].terminalInfo.terminal;
      items[1] = createMockTerminalQuickPickItem(activeTerminal, true);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(reformattedItem(items[1]));
      const logger = createMockLogger();

      await showTerminalPicker(items, quickPickProvider, createHandlers(identityCallback), logger);

      const expectedItems = items.map((item) => ({
        ...reformattedItem(item),
        description: item.terminalInfo.isActive ? 'active' : undefined,
      }));
      expect(quickPickProvider.showQuickPick).toHaveBeenCalledWith(expectedItems, {
        title: 'RangeLink',
        placeHolder: 'Choose a terminal to bind to',
      });
    });
  });

  describe('dismiss handling', () => {
    it('returns undefined when user dismisses and no onDismissed handler', async () => {
      const items = createTerminalItems(3);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        items,
        quickPickProvider,
        createHandlers(identityCallback),
        logger,
      );

      expect(result).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 3 },
        'User cancelled terminal picker',
      );
    });

    it('calls onDismissed handler when provided and user dismisses', async () => {
      const items = createTerminalItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        items,
        quickPickProvider,
        createHandlers((terminal) => terminal.name, {
          onDismissed: () => 'dismissed-value',
        }),
        logger,
      );

      expect(result).toBe('dismissed-value');
      expect(logger.debug).not.toHaveBeenCalledWith(
        { fn: 'showTerminalPicker', terminalCount: 2 },
        'User cancelled terminal picker',
      );
    });

    it('supports async onDismissed handler', async () => {
      const items = createTerminalItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showTerminalPicker(
        items,
        quickPickProvider,
        createHandlers(async (terminal) => terminal.name, {
          onDismissed: async () => 'async-dismissed',
        }),
        logger,
      );

      expect(result).toBe('async-dismissed');
    });
  });
});

describe('buildTerminalPickerItems', () => {
  const createTerminalItems = (count: number): TerminalBindableQuickPickItem[] =>
    Array.from({ length: count }, (_, i) => {
      const terminal = createMockTerminal({ name: `terminal-${i + 1}` });
      return createMockTerminalQuickPickItem(terminal, false);
    });

  it('reformats labels using the provided label builder', () => {
    const items = createTerminalItems(2);

    const result = buildTerminalPickerItems(items, (terminal) => `Custom: ${terminal.name}`);

    expect(result).toStrictEqual([
      {
        label: 'Custom: terminal-1',
        description: undefined,
        displayName: 'terminal-1',
        bindOptions: items[0].bindOptions,
        itemKind: 'bindable',
        isActive: false,
        terminalInfo: items[0].terminalInfo,
      },
      {
        label: 'Custom: terminal-2',
        description: undefined,
        displayName: 'terminal-2',
        bindOptions: items[1].bindOptions,
        itemKind: 'bindable',
        isActive: false,
        terminalInfo: items[1].terminalInfo,
      },
    ]);
  });

  it('marks active terminal with active description', () => {
    const items = createTerminalItems(3);
    const activeTerminal = items[1].terminalInfo.terminal;
    items[1] = createMockTerminalQuickPickItem(activeTerminal, true);

    const result = buildTerminalPickerItems(items, (terminal) => terminal.name);

    expect(result[0].description).toBeUndefined();
    expect(result[1].description).toBe('active');
    expect(result[2].description).toBeUndefined();
  });

  it('uses plain terminal name as displayName regardless of label builder', () => {
    const items = createTerminalItems(2);

    const result = buildTerminalPickerItems(items, () => 'prefixed-label');

    expect(result[0].displayName).toBe('terminal-1');
    expect(result[1].displayName).toBe('terminal-2');
  });

  it('preserves bindOptions and terminalInfo from source items', () => {
    const items = createTerminalItems(1);

    const result = buildTerminalPickerItems(items, (terminal) => terminal.name);

    expect(result[0].bindOptions).toStrictEqual(items[0].bindOptions);
    expect(result[0].terminalInfo).toStrictEqual(items[0].terminalInfo);
  });
});
