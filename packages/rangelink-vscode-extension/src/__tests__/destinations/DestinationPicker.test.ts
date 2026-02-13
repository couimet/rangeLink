import { createMockLogger } from 'barebone-logger-testing';

import {
  DestinationPicker,
  type DestinationPickerOptions,
} from '../../destinations/DestinationPicker';
import type { TerminalPickerHandlers } from '../../destinations/types';
import { MessageCode, type TerminalBindableQuickPickItem } from '../../types';
import {
  createMockAIAssistantQuickPickItem,
  createMockDestinationAvailabilityService,
  createMockTerminal,
  createMockTerminalMoreQuickPickItem,
  createMockTerminalQuickPickItem,
  createMockTextEditorQuickPickItem,
  createMockVscodeAdapter,
  spyOnShowTerminalPicker,
} from '../helpers';

describe('DestinationPicker', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockAvailabilityService: ReturnType<typeof createMockDestinationAvailabilityService>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let showQuickPickMock: jest.Mock;
  let picker: DestinationPicker;
  let showTerminalPickerSpy: jest.SpyInstance;

  const defaultOptions: DestinationPickerOptions = {
    noDestinationsMessageCode: MessageCode.INFO_JUMP_NO_DESTINATIONS_AVAILABLE,
    placeholderMessageCode: MessageCode.INFO_JUMP_QUICK_PICK_PLACEHOLDER,
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAvailabilityService = createMockDestinationAvailabilityService();
    mockAdapter = createMockVscodeAdapter();
    showQuickPickMock = mockAdapter.__getVscodeInstance().window.showQuickPick as jest.Mock;
    showTerminalPickerSpy = spyOnShowTerminalPicker();
    picker = new DestinationPicker(mockAdapter, mockAvailabilityService, mockLogger);
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'DestinationPicker.constructor' },
        'DestinationPicker initialized',
      );
    });
  });

  describe('execute()', () => {
    describe('no destinations available', () => {
      it('shows info message and returns no-resource when no destinations', async () => {
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({});

        const result = await picker.pick(defaultOptions);

        expect(result).toStrictEqual({ outcome: 'no-resource' });
        const showInfoMock = mockAdapter.__getVscodeInstance().window
          .showInformationMessage as jest.Mock;
        expect(showInfoMock).toHaveBeenCalledWith(
          'No destinations available. Open a terminal, split editor, or install an AI assistant extension.',
        );
        expect(showQuickPickMock).not.toHaveBeenCalled();
      });
    });

    describe('user cancels picker', () => {
      it('returns cancelled when user dismisses quick pick', async () => {
        const terminal = createMockTerminal({ name: 'bash' });
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({
          terminal: [createMockTerminalQuickPickItem(terminal)],
        });
        showQuickPickMock.mockResolvedValue(undefined);

        const result = await picker.pick(defaultOptions);

        expect(result).toStrictEqual({ outcome: 'cancelled' });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'DestinationPicker.pick' },
          'Showing destination picker',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'DestinationPicker.pick', availableCount: 2 },
          'Showing quick pick with 2 items',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'DestinationPicker.pick' },
          'User cancelled quick pick',
        );
      });
    });

    describe('bindable item selection', () => {
      it('returns selected with terminal bindOptions when user selects terminal', async () => {
        const terminal = createMockTerminal({ name: 'zsh' });
        const terminalItem = createMockTerminalQuickPickItem(terminal);
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({
          terminal: [terminalItem],
        });
        showQuickPickMock.mockResolvedValue(terminalItem);

        const result = await picker.pick(defaultOptions);

        expect(result).toStrictEqual({
          outcome: 'selected',
          bindOptions: { kind: 'terminal', terminal },
        });
      });

      it('returns selected with AI assistant bindOptions when user selects claude-code', async () => {
        const claudeItem = createMockAIAssistantQuickPickItem('claude-code', 'Claude Code Chat');
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({
          'claude-code': [claudeItem],
        });
        showQuickPickMock.mockResolvedValue(claudeItem);

        const result = await picker.pick(defaultOptions);

        expect(result).toStrictEqual({
          outcome: 'selected',
          bindOptions: { kind: 'claude-code' },
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationPicker.handleQuickPickSelection',
            bindOptions: { kind: 'claude-code' },
          },
          'User selected destination with bind options',
        );
      });

      it('returns selected with text-editor bindOptions when user selects text editor', async () => {
        const editorItem = createMockTextEditorQuickPickItem();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({
          'text-editor': [editorItem],
        });
        showQuickPickMock.mockResolvedValue(editorItem);

        const result = await picker.pick(defaultOptions);

        expect(result).toStrictEqual({
          outcome: 'selected',
          bindOptions: { kind: 'text-editor' },
        });
      });
    });

    describe('terminal-more item selection', () => {
      it('shows secondary terminal picker when user selects "More terminals..."', async () => {
        const terminal1 = createMockTerminal({ name: 'Terminal 1' });
        const terminal2 = createMockTerminal({ name: 'Terminal 2' });
        const moreItem = createMockTerminalMoreQuickPickItem(5);
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({
          terminal: [createMockTerminalQuickPickItem(terminal1)],
          'terminal-more': moreItem,
        });
        showQuickPickMock.mockResolvedValue(moreItem);

        mockAvailabilityService.getTerminalItems.mockResolvedValue([
          createMockTerminalQuickPickItem(terminal1),
          createMockTerminalQuickPickItem(terminal2),
        ]);

        showTerminalPickerSpy.mockImplementation(
          async <T>(
            _terminals: readonly TerminalBindableQuickPickItem[],
            _provider: unknown,
            handlers: TerminalPickerHandlers<T>,
            _logger: unknown,
          ): Promise<T | undefined> =>
            handlers.onSelected({ terminal: terminal2, name: 'Terminal 2', isActive: false }),
        );

        const result = await picker.pick(defaultOptions);

        expect(showTerminalPickerSpy).toHaveBeenCalled();
        expect(result).toStrictEqual({
          outcome: 'selected',
          bindOptions: { kind: 'terminal', terminal: terminal2 },
        });
      });

      it('returns to main picker when user cancels secondary terminal picker', async () => {
        const terminal = createMockTerminal({ name: 'Terminal 1' });
        const terminalItem = createMockTerminalQuickPickItem(terminal);
        const moreItem = createMockTerminalMoreQuickPickItem(3);
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({
          terminal: [terminalItem],
          'terminal-more': moreItem,
        });

        let callCount = 0;
        showQuickPickMock.mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return moreItem;
          }
          return terminalItem;
        });

        showTerminalPickerSpy.mockImplementation(
          async <T>(
            _terminals: readonly TerminalBindableQuickPickItem[],
            _provider: unknown,
            handlers: TerminalPickerHandlers<T>,
            _logger: unknown,
          ): Promise<T | undefined> => handlers.onDismissed?.(),
        );

        const result = await picker.pick(defaultOptions);

        expect(showQuickPickMock).toHaveBeenCalledTimes(2);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'DestinationPicker.showSecondaryTerminalPicker' },
          'User returned from secondary terminal picker',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'DestinationPicker.pick' },
          'Returning to main destination picker',
        );
        expect(result).toStrictEqual({
          outcome: 'selected',
          bindOptions: { kind: 'terminal', terminal },
        });
      });
    });
  });
});
