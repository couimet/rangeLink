import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import { FocusErrorReason } from '../../../destinations/capabilities/FocusCapability';
import { TerminalFocusCapability } from '../../../destinations/capabilities/TerminalFocusCapability';
import {
  createMockInsertFactory,
  createMockTerminal,
  createMockVscodeAdapter,
} from '../../helpers';

const LOGGING_CONTEXT = { fn: 'test' };

describe('TerminalFocusCapability', () => {
  const mockLogger = createMockLogger();

  it('focuses terminal and returns inserter on success', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const terminal = createMockTerminal({ name: 'zsh' });
    const mockInserterFn = jest.fn().mockResolvedValue(true);
    const mockInsertFactory = createMockInsertFactory<vscode.Terminal>();
    mockInsertFactory.forTarget.mockReturnValue(mockInserterFn);

    const capability = new TerminalFocusCapability(
      mockAdapter,
      terminal,
      mockInsertFactory,
      mockLogger,
    );

    const result = await capability.focus(LOGGING_CONTEXT);

    expect(result).toBeOkWith((value: { inserter: unknown }) => {
      expect(value.inserter).toBe(mockInserterFn);
    });
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'test', terminalName: 'zsh' },
      'Terminal focused via showTerminal()',
    );
  });

  it('returns TERMINAL_FOCUS_FAILED error when showTerminal throws', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const focusError = new Error('Terminal disposed');
    jest.spyOn(mockAdapter, 'showTerminal').mockImplementation(() => {
      throw focusError;
    });
    const terminal = createMockTerminal({ name: 'bash' });
    const mockInsertFactory = createMockInsertFactory<vscode.Terminal>();

    const capability = new TerminalFocusCapability(
      mockAdapter,
      terminal,
      mockInsertFactory,
      mockLogger,
    );

    const result = await capability.focus(LOGGING_CONTEXT);

    expect(result).toBeErrWith((error: { reason: string; cause: unknown }) => {
      expect(error).toStrictEqual({
        reason: FocusErrorReason.TERMINAL_FOCUS_FAILED,
        cause: focusError,
      });
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'test', terminalName: 'bash', error: focusError },
      'Failed to focus terminal',
    );
  });
});
