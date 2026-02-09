import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { TerminalFocusType } from '../../types/TerminalFocusType';

import { FocusErrorReason, type FocusCapability, type FocusResult } from './FocusCapability';
import type { InsertFactory } from './insertFactories';

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

  async focus(context: LoggingContext): Promise<FocusResult> {
    try {
      this.ideAdapter.showTerminal(this.terminal, TerminalFocusType.StealFocus);

      this.logger.debug(
        { ...context, terminalName: this.terminal.name },
        'Terminal focused via showTerminal()',
      );

      return Result.ok({
        inserter: this.insertFactory.forTarget(this.terminal),
      });
    } catch (error) {
      this.logger.warn(
        { ...context, terminalName: this.terminal.name, error },
        'Failed to focus terminal',
      );
      return Result.err({
        reason: FocusErrorReason.TERMINAL_FOCUS_FAILED,
        cause: error,
      });
    }
  }
}
