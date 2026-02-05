import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import { BindToTerminalCommand } from '../../commands/BindToTerminalCommand';
import type { DestinationAvailabilityService } from '../../destinations/DestinationAvailabilityService';
import type { TerminalPickerResult } from '../../destinations/utils/showTerminalPicker';
import * as showTerminalPickerModule from '../../destinations/utils/showTerminalPicker';
import { BindAbortReason, type TerminalBindResult } from '../../types';
import {
  createMockDestinationAvailabilityService,
  createMockDestinationManager,
  createMockGroupedTerminals,
  createMockTerminal,
  createMockTerminalQuickPickItem,
  createMockVscodeAdapter,
} from '../helpers';

describe('BindToTerminalCommand', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockAvailabilityService: jest.Mocked<DestinationAvailabilityService>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let command: BindToTerminalCommand;
  let showTerminalPickerSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockDestinationManager = createMockDestinationManager();
    mockAvailabilityService = createMockDestinationAvailabilityService();
    showTerminalPickerSpy = jest.spyOn(showTerminalPickerModule, 'showTerminalPicker');
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
          destinationTypes: ['terminal'],
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
        const bindResult: TerminalBindResult = {
          outcome: 'bound',
          details: { terminalName: 'My Terminal' },
        };
        mockDestinationManager.bindTerminal.mockResolvedValue(bindResult);
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({
          outcome: 'bound',
          details: { terminalName: 'My Terminal' },
        });
        expect(showTerminalPickerSpy).not.toHaveBeenCalled();
        expect(mockDestinationManager.bindTerminal).toHaveBeenCalledWith(terminal);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'BindToTerminalCommand.execute', terminalName: 'My Terminal' },
          'Single terminal, auto-binding',
        );
      });

      it('returns aborted when already bound to same terminal', async () => {
        const terminal = createMockTerminal({ name: 'My Terminal' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([createMockTerminalQuickPickItem(terminal)]),
        );
        const bindResult: TerminalBindResult = {
          outcome: 'aborted',
          reason: BindAbortReason.ALREADY_BOUND_TO_SAME,
        };
        mockDestinationManager.bindTerminal.mockResolvedValue(bindResult);
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({
          outcome: 'aborted',
          reason: 'ALREADY_BOUND_TO_SAME',
        });
      });

      it('returns aborted when user declines replacement', async () => {
        const terminal = createMockTerminal({ name: 'My Terminal' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([createMockTerminalQuickPickItem(terminal)]),
        );
        const bindResult: TerminalBindResult = {
          outcome: 'aborted',
          reason: BindAbortReason.USER_DECLINED_REPLACEMENT,
        };
        mockDestinationManager.bindTerminal.mockResolvedValue(bindResult);
        command = new BindToTerminalCommand(
          mockAdapter,
          mockAvailabilityService,
          mockDestinationManager,
          mockLogger,
        );

        const result = await command.execute();

        expect(result).toStrictEqual({
          outcome: 'aborted',
          reason: 'USER_DECLINED_REPLACEMENT',
        });
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
        const bindResult: TerminalBindResult = {
          outcome: 'bound',
          details: { terminalName: 'Terminal 2' },
        };
        mockDestinationManager.bindTerminal.mockResolvedValue(bindResult);
        showTerminalPickerSpy.mockImplementation(
          async (
            _terminals,
            _activeTerminal,
            _adapter,
            _options,
            _logger,
            onSelected: (terminal: vscode.Terminal) => Promise<TerminalBindResult>,
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

        expect(result).toStrictEqual({ outcome: 'bound', details: { terminalName: 'Terminal 2' } });
        expect(showTerminalPickerSpy).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.bindTerminal).toHaveBeenCalledWith(terminal2);
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
        expect(mockDestinationManager.bindTerminal).not.toHaveBeenCalled();
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

      it('returns aborted when picker selection results in abort', async () => {
        const terminal1 = createMockTerminal({ name: 'Terminal 1' });
        const terminal2 = createMockTerminal({ name: 'Terminal 2' });
        mockAdapter = createMockVscodeAdapter();
        mockAvailabilityService.getGroupedDestinationItems.mockResolvedValue(
          createMockGroupedTerminals([
            createMockTerminalQuickPickItem(terminal1),
            createMockTerminalQuickPickItem(terminal2),
          ]),
        );
        const bindResult: TerminalBindResult = {
          outcome: 'aborted',
          reason: BindAbortReason.USER_DECLINED_REPLACEMENT,
        };
        mockDestinationManager.bindTerminal.mockResolvedValue(bindResult);
        showTerminalPickerSpy.mockImplementation(
          async (
            _terminals,
            _activeTerminal,
            _adapter,
            _options,
            _logger,
            onSelected: (terminal: vscode.Terminal) => Promise<TerminalBindResult>,
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
          outcome: 'aborted',
          reason: 'USER_DECLINED_REPLACEMENT',
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
