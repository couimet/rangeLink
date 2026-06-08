import { createMockLogger } from 'barebone-logger-testing';
import { Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import { TerminalFocusCapability } from '../../../destinations/capabilities/TerminalFocusCapability';
import { RangeLinkExtensionError } from '../../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../../errors/RangeLinkExtensionErrorCodes';
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
      { fn: 'test::focus', terminalName: 'zsh' },
      'Terminal focused via showTerminal()',
    );
  });

  it('returns TERMINAL_FOCUS_FAILED error when showTerminal fails', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const focusError = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.TERMINAL_NOT_DEFINED,
      message: 'Terminal reference is not defined',
    });
    jest.spyOn(mockAdapter, 'showTerminal').mockReturnValue(Result.err(focusError));
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
        reason: 'TERMINAL_FOCUS_FAILED',
        cause: focusError,
      });
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'test::focus', terminalName: 'bash', error: focusError },
      'Failed to focus terminal',
    );
  });
});
