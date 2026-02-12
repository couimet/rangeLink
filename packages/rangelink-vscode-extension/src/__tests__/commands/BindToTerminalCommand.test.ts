import { createMockLogger } from 'barebone-logger-testing';
import { Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import { BindToTerminalCommand } from '../../commands/BindToTerminalCommand';
import type { BindSuccessInfo } from '../../destinations';
import type { TerminalPickerResult } from '../../destinations/utils/showTerminalPicker';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import type { ExtensionResult } from '../../types';
import {
  createMockDestinationAvailabilityService,
  createMockDestinationManager,
  createMockGroupedTerminals,
  createMockTerminal,
  createMockTerminalQuickPickItem,
  createMockVscodeAdapter,
  spyOnShowTerminalPicker,
} from '../helpers';

describe('BindToTerminalCommand', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockAvailabilityService: ReturnType<typeof createMockDestinationAvailabilityService>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let command: BindToTerminalCommand;
  let showTerminalPickerSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockDestinationManager = createMockDestinationManager();
    mockAvailabilityService = createMockDestinationAvailabilityService();
    showTerminalPickerSpy = spyOnShowTerminalPicker();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      mockAdapter = createMockVscodeAdapter();
      new BindToTerminalCommand(
        mockAdapter,
        mockAvailabilityService,
        mockDestinationManager,
        mockLogger,
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTerminalCommand.constructor' },
        'BindToTerminalCommand initialized',
      );
    });
  });

  describe('execute()', () => {
    describe('0 terminals', () => {
      it('returns no-resource outcome when no terminals exist', async () => {
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue({});
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({ outcome: 'no-resource' });
        expect(mockAvailabilityService.getGroupedDestinationItems).toHaveBeenCalledWith({
          destinationKinds: ['terminal'],
          terminalThreshold: Infinity,
        });
        expect(mockAdapter.__getVscodeInstance().window.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active terminal. Open a terminal and try again.',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'BindToTerminalCommand.execute', terminalCount: 0 },
          'Starting bind to terminal command',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'BindToTerminalCommand.execute' },
          'No terminals available',
        );
        expect(showTerminalPickerSpy).not.toHaveBeenCalled();
      });
    });

    describe('1 terminal (auto-bind)', () => {
      it('auto-binds to single terminal without showing picker', async () => {
        const terminal = createMockTerminal({ name: 'My Terminal' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([createMockTerminalQuickPickItem(terminal)]),
        );
        (mockDestinationManager.bind as jest.Mock).mockResolvedValue(
          Result.ok({ destinationName: 'My Terminal', destinationKind: 'terminal' }),
        );
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({
          outcome: 'bound',
          destinationName: 'My Terminal',
        });
        expect(showTerminalPickerSpy).not.toHaveBeenCalled();
        expect(mockDestinationManager.bind).toHaveBeenCalledWith({
          kind: 'terminal',
          terminal,
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'BindToTerminalCommand.execute', terminalName: 'My Terminal' },
          'Single terminal, auto-binding',
        );
      });

      it('returns bind-failed when bind fails', async () => {
        const terminal = createMockTerminal({ name: 'My Terminal' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([createMockTerminalQuickPickItem(terminal)]),
        );
        const bindError = new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
          message: 'Terminal bind failed',
          functionName: 'PasteDestinationManager.bind',
        });
        (mockDestinationManager.bind as jest.Mock).mockResolvedValue(Result.err(bindError));
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({
          outcome: 'bind-failed',
          error: bindError,
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'BindToTerminalCommand.execute', terminalName: 'My Terminal' },
          'Single terminal, auto-binding',
        );
      });
    });

    describe('2+ terminals (picker)', () => {
      it('shows picker and returns bound on selection', async () => {
        const terminal1 = createMockTerminal({ name: 'Terminal 1' });
        const terminal2 = createMockTerminal({ name: 'Terminal 2' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([
            createMockTerminalQuickPickItem(terminal1, true),
            createMockTerminalQuickPickItem(terminal2),
          ]),
        );
        const bindOk = Result.ok({ destinationName: 'Terminal 2', destinationKind: 'terminal' });
        (mockDestinationManager.bind as jest.Mock).mockResolvedValue(bindOk);
        showTerminalPickerSpy.mockImplementation(
          async (
            _terminals: readonly vscode.Terminal[],
            _activeTerminal: vscode.Terminal | undefined,
            _adapter: unknown,
            _options: unknown,
            _logger: unknown,
            onSelected: (terminal: vscode.Terminal) => Promise<ExtensionResult<BindSuccessInfo>>,
          ) => {
            const selectedResult = await onSelected(terminal2);
            return { outcome: 'selected' as const, result: selectedResult };
          },
        );
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({ outcome: 'bound', destinationName: 'Terminal 2' });
        expect(showTerminalPickerSpy).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.bind).toHaveBeenCalledWith({
          kind: 'terminal',
          terminal: terminal2,
        });
      });

      it('returns cancelled when user cancels picker', async () => {
        const terminal1 = createMockTerminal({ name: 'Terminal 1' });
        const terminal2 = createMockTerminal({ name: 'Terminal 2' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([
            createMockTerminalQuickPickItem(terminal1),
            createMockTerminalQuickPickItem(terminal2),
          ]),
        );
        showTerminalPickerSpy.mockResolvedValue({
          outcome: 'cancelled',
        } as TerminalPickerResult<unknown>);
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({ outcome: 'cancelled' });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'BindToTerminalCommand.execute', pickerOutcome: 'cancelled' },
          'User cancelled terminal picker',
        );
        expect(mockDestinationManager.bind).not.toHaveBeenCalled();
      });

      it('returns cancelled when user escapes secondary picker', async () => {
        const terminal1 = createMockTerminal({ name: 'Terminal 1' });
        const terminal2 = createMockTerminal({ name: 'Terminal 2' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([
            createMockTerminalQuickPickItem(terminal1),
            createMockTerminalQuickPickItem(terminal2),
          ]),
        );
        showTerminalPickerSpy.mockResolvedValue({
          outcome: 'returned-to-destination-picker',
        } as TerminalPickerResult<unknown>);
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({ outcome: 'cancelled' });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'BindToTerminalCommand.execute', pickerOutcome: 'returned-to-destination-picker' },
          'User cancelled terminal picker',
        );
      });

      it('returns bind-failed when picker selection results in bind failure', async () => {
        const terminal1 = createMockTerminal({ name: 'Terminal 1' });
        const terminal2 = createMockTerminal({ name: 'Terminal 2' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([
            createMockTerminalQuickPickItem(terminal1),
            createMockTerminalQuickPickItem(terminal2),
          ]),
        );
        const bindError = new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
          message: 'Terminal bind failed',
          functionName: 'PasteDestinationManager.bind',
        });
        (mockDestinationManager.bind as jest.Mock).mockResolvedValue(Result.err(bindError));
        showTerminalPickerSpy.mockImplementation(
          async (
            _terminals: readonly vscode.Terminal[],
            _activeTerminal: vscode.Terminal | undefined,
            _adapter: unknown,
            _options: unknown,
            _logger: unknown,
            onSelected: (terminal: vscode.Terminal) => Promise<ExtensionResult<BindSuccessInfo>>,
          ) => {
            const selectedResult = await onSelected(terminal2);
            return { outcome: 'selected' as const, result: selectedResult };
          },
        );
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({
          outcome: 'bind-failed',
          error: bindError,
        });
      });

      it('passes correct options to terminal picker', async () => {
        const terminal1 = createMockTerminal({ name: 'Terminal 1' });
        const terminal2 = createMockTerminal({ name: 'Terminal 2' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([
            createMockTerminalQuickPickItem(terminal1, true),
            createMockTerminalQuickPickItem(terminal2),
          ]),
        );
        showTerminalPickerSpy.mockResolvedValue({
          outcome: 'cancelled',
        } as TerminalPickerResult<unknown>);
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        await command.execute();

        expect(showTerminalPickerSpy).toHaveBeenCalledWith(
          [terminal1, terminal2],
          terminal1,
          mockAdapter,
          {
            maxItemsBeforeMore: Infinity,
            title: 'RangeLink',
            placeholder: 'Select terminal to bind to',
            activeDescription: 'active',
            moreTerminalsLabel: 'More terminals...',
          },
          mockLogger,
          expect.any(Function),
        );
      });
    });
  });
});
