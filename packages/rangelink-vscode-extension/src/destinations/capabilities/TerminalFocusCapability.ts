import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { TerminalFocusType } from '../../types/TerminalFocusType';

import { type FocusCapability, FocusErrorReason, FocusResult } from './FocusCapability';
import type { InsertFactory } from './insertFactories';

import type { Logger, LoggingContext } from '@couimet/logger-contract';
import type * as vscode from 'vscode';

/**
 * FocusCapability for terminal destinations.
 *
 * Uses InsertFactory injection for decoupled insert logic.
 */
export class TerminalFocusCapability implements FocusCapability {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly terminal: vscode.Terminal,
    private readonly insertFactory: InsertFactory<vscode.Terminal>,
    private readonly logger: Logger,
  ) {}

  focus(context: LoggingContext): Promise<FocusResult> {
    const logCtx: LoggingContext = {
      ...context,
      terminalName: this.terminal.name,
      fn: `${context.fn}::focus`,
    };

    const showResult = this.ideAdapter.showTerminal(this.terminal, TerminalFocusType.StealFocus);
    if (!showResult.success) {
      this.logger.warn({ ...logCtx, error: showResult.error }, 'Failed to focus terminal');
      return Promise.resolve(
        FocusResult.err({
          reason: FocusErrorReason.TERMINAL_FOCUS_FAILED,
          cause: showResult.error,
        }),
      );
    }

    this.logger.debug(logCtx, 'Terminal focused via showTerminal()');

    return Promise.resolve(
      FocusResult.ok({
        inserter: this.insertFactory.forTarget(this.terminal),
      }),
    );
  }
}
