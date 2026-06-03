import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import {
  CONTEXT_IS_ACTIVE_TERMINAL_BINDABLE,
  CONTEXT_IS_ACTIVE_TERMINAL_PASTE_DESTINATION,
  CONTEXT_IS_BOUND,
} from '../constants/contextKeys';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
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
    private readonly destinationManager: PasteDestinationManager,
    private readonly logger: Logger,
  ) {
    const updateAll = (): void => {
      this.updateIsBound();
      this.updateBindability();
      this.updateActiveTerminalPasteDestination();
    };

    this.logger.debug({ fn: FN }, 'ContextKeyService initializing all context keys');
    updateAll();

    this.disposables.push(
      ideAdapter.onDidOpenTerminal(updateAll),
      ideAdapter.onDidCloseTerminal(updateAll),
      ideAdapter.onDidChangeActiveTerminal(updateAll),
      destinationManager.onDidChangeBoundDestination(updateAll),
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
    const isBound = this.destinationManager.getBoundDestination() !== undefined;
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
    const bound = this.destinationManager.getBoundDestination();
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
