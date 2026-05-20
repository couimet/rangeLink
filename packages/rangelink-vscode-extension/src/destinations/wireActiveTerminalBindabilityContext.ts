import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import { CONTEXT_IS_ACTIVE_TERMINAL_BINDABLE } from '../constants/contextKeys';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

import { classifyTerminalForBinding } from './utils';

/**
 * Maintain the `rangelink.isActiveTerminalBindable` context key.
 *
 * VS Code `when` clauses cannot read `creationOptions.pty` directly, so menu
 * visibility for `rangelink.terminal.bind` requires a custom context key. This
 * helper subscribes to the terminal-lifecycle events and republishes the
 * bindability of `vscode.window.activeTerminal` whenever it changes.
 *
 * The key is set to:
 * - `true` when the active terminal is a regular shell terminal eligible for binding
 * - `false` when there is no active terminal, the active terminal has exited,
 *   it is `hideFromUser`, or it is extension-managed (pty)
 *
 * Returns a `vscode.Disposable` that the caller pushes onto the extension's
 * subscription set so the listeners are released on extension teardown.
 */
export const wireActiveTerminalBindabilityContext = (
  ideAdapter: VscodeAdapter,
  logger: Logger,
): vscode.Disposable => {
  const updateContext = (): void => {
    const activeTerminal = ideAdapter.activeTerminal;
    const classification = classifyTerminalForBinding(activeTerminal);
    const bindable =
      classification.visible === true && classification.nonBindableReason === undefined;
    logger.debug(
      {
        fn: 'wireActiveTerminalBindabilityContext.update',
        bindable,
        terminalName: activeTerminal?.name,
      },
      `Updating ${CONTEXT_IS_ACTIVE_TERMINAL_BINDABLE} context key`,
    );
    void ideAdapter.executeCommand('setContext', CONTEXT_IS_ACTIVE_TERMINAL_BINDABLE, bindable);
  };

  updateContext();

  const disposables: vscode.Disposable[] = [
    ideAdapter.onDidOpenTerminal(updateContext),
    ideAdapter.onDidCloseTerminal(updateContext),
    ideAdapter.onDidChangeActiveTerminal(updateContext),
  ];

  return {
    dispose: (): void => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
};
