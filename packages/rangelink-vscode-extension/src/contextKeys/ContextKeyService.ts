import type { Logger } from '@couimet/logger-contract';
import type * as vscode from 'vscode';

import {
  CONTEXT_IS_ACTIVE_TERMINAL_BINDABLE,
  CONTEXT_IS_ACTIVE_TERMINAL_PASTE_DESTINATION,
  CONTEXT_IS_BOUND,
} from '../constants/contextKeys';
import type { BoundSession } from '../destinations';
import { classifyTerminalForBinding } from '../destinations/utils';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { isTerminalDestination } from '../utils/destinationKindGuards';

const FN = 'ContextKeyService';

/**
 * Single owner of all VS Code context keys.
 *
 * Subscribes to terminal lifecycle and destination change events, then evaluates
 * every context key in one deterministic pass. No other component calls
 * `setContext` directly — context keys are set exclusively here.
 */
export class ContextKeyService implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly lastSetValues: Record<string, unknown> = {};

  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly session: BoundSession,
    private readonly logger: Logger,
  ) {
    const updateAll = (): void => {
      this.updateIsBound();
      this.updateBindability();
      this.updateActiveTerminalPasteDestination();
    };

    this.logger.debug({ fn: FN }, 'ContextKeyService initializing all context keys');
    updateAll();

    // Terminal lifecycle events and bound-destination changes all require
    // re-evaluating context keys. BoundSession also subscribes to some of
    // these events, but for a different purpose (auto-unbind). No overlap —
    // each class owns its own reaction to the same event sources.
    this.disposables.push(
      ideAdapter.onDidOpenTerminal(updateAll),
      ideAdapter.onDidCloseTerminal(updateAll),
      ideAdapter.onDidChangeActiveTerminal(updateAll),
      session.onDidChange(updateAll),
    );
  }

  dispose(): void {
    this.logger.debug({ fn: FN }, 'Disposing ContextKeyService');
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  getLastSetValues(): Record<string, unknown> {
    return { ...this.lastSetValues };
  }

  private updateIsBound(): void {
    const isBound = this.session.get() !== undefined;
    this.lastSetValues[CONTEXT_IS_BOUND] = isBound;
    this.logger.debug({ fn: `${FN}.updateIsBound`, isBound }, 'Evaluating isBound context key');
    this.ideAdapter.setContext(CONTEXT_IS_BOUND, isBound);
  }

  private updateBindability(): void {
    const activeTerminal = this.ideAdapter.activeTerminal;
    const classification = classifyTerminalForBinding(activeTerminal);
    const bindable =
      classification.visible === true && classification.nonBindableReason === undefined;
    this.lastSetValues[CONTEXT_IS_ACTIVE_TERMINAL_BINDABLE] = bindable;
    this.logger.debug(
      { fn: `${FN}.updateBindability`, bindable, terminalName: activeTerminal?.name },
      'Evaluating isActiveTerminalBindable context key',
    );
    this.ideAdapter.setContext(CONTEXT_IS_ACTIVE_TERMINAL_BINDABLE, bindable);
  }

  private updateActiveTerminalPasteDestination(): void {
    const bound = this.session.get();
    const active =
      bound !== undefined &&
      isTerminalDestination(bound) &&
      bound.resource.terminal === this.ideAdapter.activeTerminal;
    this.lastSetValues[CONTEXT_IS_ACTIVE_TERMINAL_PASTE_DESTINATION] = active;
    this.logger.debug(
      { fn: `${FN}.updateActiveTerminalPasteDestination`, active },
      'Evaluating isActiveTerminalPasteDestination context key',
    );
    this.ideAdapter.setContext(CONTEXT_IS_ACTIVE_TERMINAL_PASTE_DESTINATION, active);
  }
}
