import type * as vscode from 'vscode';

import type { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { registerWithLogging } from './utils';

/**
 * Abstraction over VS Code's context.subscriptions for testability.
 * Wraps the low-level push(registerCommand(...)) pattern behind a clean interface,
 * similar to how VscodeAdapter wraps raw vscode.* APIs.
 */
export interface SubscriptionRegistrar {
  registerCommand(id: string, handler: (...args: unknown[]) => unknown): void;
  registerTerminalLinkProvider<T extends vscode.TerminalLink>(
    provider: vscode.TerminalLinkProvider<T>,
    logMessage: string,
  ): void;
  registerDocumentLinkProvider(
    selector: vscode.DocumentSelector,
    provider: vscode.DocumentLinkProvider,
    logMessage: string,
  ): void;
  pushDisposable(disposable: { dispose(): void }): void;
}

/**
 * Production SubscriptionRegistrar that delegates to context.subscriptions and ideAdapter.
 */
export const createSubscriptionRegistrar = (
  context: vscode.ExtensionContext,
  ideAdapter: VscodeAdapter,
): SubscriptionRegistrar => ({
  registerCommand: (id, handler) => {
    context.subscriptions.push(ideAdapter.registerCommand(id, handler));
  },
  registerTerminalLinkProvider: (provider, logMessage) => {
    context.subscriptions.push(
      registerWithLogging(ideAdapter.registerTerminalLinkProvider(provider), logMessage),
    );
  },
  registerDocumentLinkProvider: (selector, provider, logMessage) => {
    context.subscriptions.push(
      registerWithLogging(ideAdapter.registerDocumentLinkProvider(selector, provider), logMessage),
    );
  },
  pushDisposable: (disposable) => {
    context.subscriptions.push(disposable);
  },
});
