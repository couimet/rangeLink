import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { LifecycleFeedbackProvider } from '../feedback';
import type { EventSubscriptionProvider } from '../ide';

/**
 * Auto-unbind when the bound editor tab is closed (both saved and untitled files).
 */
export const createTabCloseGuard = (deps: {
  events: EventSubscriptionProvider;
  feedback: LifecycleFeedbackProvider;
  logger: Logger;
  boundUri: vscode.Uri;
  displayName: string;
  clearBinding: () => void;
}): vscode.Disposable => {
  const boundUriString = deps.boundUri.toString();

  return deps.events.onDidChangeTabs((event) => {
    const closedTab = event.closed.find(
      (tab) => (tab.input as { uri?: vscode.Uri })?.uri?.toString() === boundUriString,
    );
    if (!closedTab) return;

    deps.logger.info(
      { fn: 'createTabCloseGuard', editorUri: boundUriString },
      `Bound editor tab closed: ${deps.displayName} — auto-unbinding`,
    );
    deps.clearBinding();
    deps.feedback.notifyAutoUnbind(deps.displayName, 'editor-closed');
  });
};
